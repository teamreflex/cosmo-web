/**
 * Export collections from an indexer database as test fixtures.
 *
 *   bun scripts/export-fixture.ts <slug> [maxTokenId]
 *
 * Reads INDEXER_URL (default: the local docker indexer). `maxTokenId` trims a
 * collection to the objekts up to that id, which is all a digital estimate
 * depends on. Reservations are found by walking the primary key to the
 * nearest digital mint on each side of the collection's objekts, keeping the
 * ranges `findReservations` would.
 */
import { SQL } from "bun";
import { collectionKind } from "../src/kind";
import { RESERVATION_MIN_GAP } from "../src/reservations";
import type { CollectionObjekts, Reservation } from "../src/types";
import type { FixtureFile } from "../tests/fixture";

const db = new SQL(
  process.env.INDEXER_URL ??
    "postgres://postgres:postgres@localhost:5434/indexer",
);

type ObjektRow = { id: string; serial: number; minted_at: Date };
type NeighbourRow = {
  id: string;
  slug: string;
  on_offline: "online" | "offline";
};

/**
 * The nearest token id below (or above) `tokenId` that belongs to a digital
 * collection numbered in token-id order. Ids of equal length sort correctly
 * as text, so this walks the primary key without a numeric index.
 */
async function nearestDigital(tokenId: number, direction: "below" | "above") {
  let cursor = String(tokenId);
  for (;;) {
    const rows: NeighbourRow[] =
      direction === "below"
        ? await db`select o.id, c.slug, c.on_offline from objekt o join collection c on c.id::text = o.collection_id
            where o.id < ${cursor} and length(o.id) = ${cursor.length} order by o.id desc limit 500`
        : await db`select o.id, c.slug, c.on_offline from objekt o join collection c on c.id::text = o.collection_id
            where o.id > ${cursor} and length(o.id) = ${cursor.length} order by o.id asc limit 500`;
    const digital = rows.find(
      (row) => collectionKind(row.slug, row.on_offline) === "sequential",
    );
    if (digital) {
      return Number(digital.id);
    }
    const last = rows.at(-1);
    if (last === undefined) {
      throw new Error(`no digital mint ${direction} ${tokenId}`);
    }
    cursor = last.id;
  }
}

async function reservationsOf(collectionId: string, tokenIds: number[]) {
  const reservations: Reservation[] = [];
  for (const tokenId of tokenIds.toSorted((a, b) => a - b)) {
    if (reservations.some((r) => tokenId > r.lo && tokenId < r.hi)) {
      continue;
    }
    const lo = await nearestDigital(tokenId, "below");
    const hi = await nearestDigital(tokenId, "above");
    if (hi - lo < RESERVATION_MIN_GAP) {
      continue;
    }
    const foreign: { id: string }[] = await db`
      select o.id from objekt o
      where o.id > ${String(lo)} and o.id < ${String(hi)} and length(o.id) = ${String(lo).length}
        and o.collection_id <> ${collectionId}`;
    reservations.push({
      lo,
      hi,
      foreign: foreign.map((row) => Number(row.id)),
    });
  }
  return reservations;
}

const [slug, maxTokenId] = process.argv.slice(2);
if (!slug) {
  throw new Error("usage: bun scripts/export-fixture.ts <slug> [maxTokenId]");
}

const [collection]: { id: string; on_offline: "online" | "offline" }[] =
  await db`select id::text, on_offline from collection where slug = ${slug}`;
if (!collection) {
  throw new Error(`unknown collection ${slug}`);
}

const rows: ObjektRow[] = await db`
  select id, serial, minted_at from objekt where collection_id = ${collection.id}`;
const objekts = rows
  .map((row) => ({
    tokenId: Number(row.id),
    serial: row.serial,
    mintedAt: row.minted_at.getTime(),
  }))
  .filter(
    (objekt) =>
      maxTokenId === undefined || objekt.tokenId <= Number(maxTokenId),
  );

const kind = collectionKind(slug, collection.on_offline);
const data: CollectionObjekts =
  kind === "sequential"
    ? { kind, objekts }
    : {
        kind,
        objekts,
        reservations: await reservationsOf(
          collection.id,
          objekts.map((objekt) => objekt.tokenId),
        ),
      };

const file: FixtureFile = {
  slug,
  exportedAt: new Date().toISOString(),
  collection: data,
};
await Bun.write(
  `${import.meta.dir}/../tests/fixtures/${slug}.json`,
  JSON.stringify(file),
);
process.stdout.write(
  `${slug}: ${objekts.length} objekts${data.kind === "reserved" ? `, ${data.reservations.length} reservations` : ""}\n`,
);
await db.close();
