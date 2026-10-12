// oxlint-disable no-console -- CLI script reporting progress on stdout
import {
  collections,
  serialConfirmations,
  serialReservations,
} from "@apollo/database/indexer/schema";
import { parseArgs } from "node:util";
import * as z from "zod";
import {
  collectionKind,
  estimateSerials,
  findReservations,
  SERIAL_CUTOFF,
  type SerialUpdate,
} from "../src";
import {
  client,
  collectionsMintedSince,
  db,
  INDEXER_DATABASE_URL,
  loadCollection,
  loadConfirmations,
  writeSerials,
} from "./database";

/**
 * Backfill estimated serials into the indexer database at
 * INDEXER_DATABASE_URL.
 *
 *   bun scripts/backfill.ts reservations
 *   bun scripts/backfill.ts confirmations
 *   bun scripts/backfill.ts serials [--dry-run] [--batch 1000] [--pause 250]
 *
 * `reservations` adds every reserved range between online mints so far to
 * serial_reservation, streaming token ids through `psql`. Ranges already
 * stored are kept, so it is safe to run while the processor adds its own:
 * run it once before the backfill, and again once the processor that
 * maintains the table is deployed, for the ranges opened in between.
 *
 * `confirmations` inserts the real serials known before the admin tool
 * existed.
 *
 * `serials` estimates every collection with an objekt minted after the
 * cutoff, then writes the serials that differ in token-id order, `--batch`
 * rows per statement with `--pause` milliseconds between statements. It
 * estimates from what is stored, so re-running it resumes.
 */

/**
 * Real serials known from outside the estimator: token 24952662 was the one
 * mint after the cutoff that COSMO still numbered, and the rest were read
 * from the COSMO app.
 */
const KNOWN_SERIALS: [tokenId: number, serial: number][] = [
  [24952662, 43],
  [24962736, 1],
  [24962737, 2],
  [24963473, 80],
  [24973615, 1],
  [24974058, 50],
  [24974059, 51],
  [24978091, 178],
  [25008915, 377],
  [26799354, 574],
  [24976401, 23],
  [24976402, 24],
  [27473255, 592],
  [24968216, 21],
  [27137586, 440],
  [28919711, 2990],
  [30072049, 130],
  [30090253, 1089],
];

const args = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    batch: { type: "string", default: "1000" },
    pause: { type: "string", default: "250" },
  },
});
const options = z
  .object({
    "dry-run": z.boolean(),
    batch: z.coerce.number().int().positive(),
    pause: z.coerce.number().int().nonnegative(),
  })
  .parse(args.values);

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Token ids of every objekt in a digital collection numbered in token-id
 * order, ascending. Streamed through `psql` because there are 20M+ of them.
 */
async function onlineTokenIds(): Promise<Float64Array> {
  const sequential = new Set(
    (
      await db
        .select({
          id: collections.id,
          slug: collections.slug,
          onOffline: collections.onOffline,
        })
        .from(collections)
    )
      .filter(
        (collection) =>
          collectionKind(collection.slug, collection.onOffline) ===
          "sequential",
      )
      .map((collection) => collection.id),
  );

  const psql = Bun.spawn(
    [
      "psql",
      INDEXER_DATABASE_URL,
      "-c",
      String.raw`\copy (select id, collection_id from objekt) to stdout`,
    ],
    { stdout: "pipe", stderr: "inherit" },
  );
  let tokenIds = new Float64Array(1 << 24);
  let size = 0;
  let pending = "";
  const decoder = new TextDecoder();
  for await (const bytes of psql.stdout) {
    const lines = (pending + decoder.decode(bytes, { stream: true })).split(
      "\n",
    );
    pending = lines.pop() ?? "";
    for (const line of lines) {
      const [id, collectionId] = line.split("\t");
      if (collectionId === undefined || !sequential.has(collectionId)) {
        continue;
      }
      if (size === tokenIds.length) {
        const grown = new Float64Array(tokenIds.length * 2);
        grown.set(tokenIds);
        tokenIds = grown;
      }
      tokenIds[size++] = Number(id);
    }
  }
  if ((await psql.exited) !== 0) {
    throw new Error("psql failed");
  }
  return tokenIds.slice(0, size).sort();
}

async function seedReservations() {
  const tokenIds = await onlineTokenIds();
  const ranges = findReservations(Array.from(tokenIds));
  log(`${tokenIds.length} online mints, ${ranges.length} reserved ranges`);

  for (let index = 0; index < ranges.length; index += 5000) {
    await db
      .insert(serialReservations)
      .values(ranges.slice(index, index + 5000))
      .onConflictDoNothing();
  }
  log("missing ranges added to serial_reservation");
}

async function seedConfirmations() {
  await db
    .insert(serialConfirmations)
    .values(
      KNOWN_SERIALS.map(([tokenId, serial]) => ({
        tokenId: String(tokenId),
        serial,
      })),
    )
    .onConflictDoNothing();
  log(`${KNOWN_SERIALS.length} confirmations inserted where missing`);
}

async function backfillSerials() {
  const minted = await collectionsMintedSince(SERIAL_CUTOFF);
  log(`${minted.length} collections minted since the cutoff`);

  const updates: SerialUpdate[] = [];
  const zeros = { sequential: 0, reserved: 0 };
  for (const [index, collection] of minted.entries()) {
    const objekts = await loadCollection(collection);
    const changed = estimateSerials(
      objekts,
      await loadConfirmations(collection.id),
    );
    updates.push(...changed);

    const serials = new Map(
      changed.map((update) => [update.tokenId, update.serial]),
    );
    for (const objekt of objekts.objekts) {
      if (
        objekt.mintedAt > SERIAL_CUTOFF &&
        (serials.get(objekt.tokenId) ?? objekt.serial) === 0
      ) {
        zeros[objekts.kind]++;
      }
    }
    if ((index + 1) % 500 === 0) {
      log(`estimated ${index + 1}/${minted.length} collections`);
    }
  }
  log(
    `${updates.length} serials to write; left at 0: ${zeros.sequential} digital, ${zeros.reserved} physical or coupon`,
  );
  if (options["dry-run"]) {
    return;
  }

  updates.sort((a, b) => a.tokenId - b.tokenId);
  for (let index = 0; index < updates.length; index += options.batch) {
    const batch = updates.slice(index, index + options.batch);
    await writeSerials(batch);
    const written = index + batch.length;
    if (written % (options.batch * 50) === 0 || written === updates.length) {
      log(
        `wrote ${written}/${updates.length}, up to token ${batch.at(-1)?.tokenId}`,
      );
    }
    await Bun.sleep(options.pause);
  }
}

switch (args.positionals[0]) {
  case "reservations":
    await seedReservations();
    break;
  case "confirmations":
    await seedConfirmations();
    break;
  case "serials":
    await backfillSerials();
    break;
  default:
    throw new Error(
      "usage: bun scripts/backfill.ts reservations | confirmations | serials [--dry-run] [--batch n] [--pause ms]",
    );
}
await client.close();
