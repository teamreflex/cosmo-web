/**
 * Measure estimator accuracy over every collection in an indexer database.
 * Serials minted after a pretend cutoff are hidden, estimated, and compared
 * with the real ones. Run it before rollout and after any rule change.
 *
 *   bun scripts/accuracy.ts [cutoff] [minGap]
 *
 * `cutoff` defaults to 2025-12-15T00:00:00Z and `minGap` to
 * RESERVATION_MIN_GAP. Reads INDEXER_URL (default: the local docker indexer)
 * and streams objekts through `psql`, so nothing is written to disk.
 */
import { SQL } from "bun";
import {
  collectionKind,
  estimateSerials,
  findReservations,
  RESERVATION_MIN_GAP,
  type CollectionObjekts,
  type ObjektSerial,
  type Reservation,
  type ReservedRange,
} from "../src";

const url =
  process.env.INDEXER_URL ??
  "postgres://postgres:postgres@localhost:5434/indexer";
const [cutoffArg, minGapArg] = process.argv.slice(2);
const cutoff = Date.parse(cutoffArg ?? "2025-12-15T00:00:00Z");
const minGap =
  minGapArg === undefined ? RESERVATION_MIN_GAP : Number(minGapArg);

type CollectionRow = {
  id: string;
  slug: string;
  on_offline: "online" | "offline";
};

const db = new SQL(url);
const collectionRows: CollectionRow[] =
  await db`select id, slug, on_offline from collection`;
await db.close();
const collections = collectionRows.map((row) => ({
  slug: row.slug,
  kind: collectionKind(row.slug, row.on_offline),
  physical: row.on_offline === "offline",
}));
const collectionIndex = new Map(
  collectionRows.map((row, index) => [row.id, index]),
);

/**
 * Every objekt as parallel typed arrays, which keeps 20M+ rows to a few
 * hundred MB.
 */
let capacity = 1 << 24;
let size = 0;
let tokenIds = new Float64Array(capacity);
let serials = new Int32Array(capacity);
let mintedAts = new Float64Array(capacity);
let owners = new Int32Array(capacity);

function grow() {
  capacity *= 2;
  const resize = <T extends Float64Array | Int32Array>(array: T, next: T) => {
    next.set(array);
    return next;
  };
  tokenIds = resize(tokenIds, new Float64Array(capacity));
  serials = resize(serials, new Int32Array(capacity));
  mintedAts = resize(mintedAts, new Float64Array(capacity));
  owners = resize(owners, new Int32Array(capacity));
}

const psql = Bun.spawn(
  [
    "psql",
    url,
    "-c",
    String.raw`\copy (select id, collection_id, serial, (extract(epoch from minted_at) * 1000)::bigint from objekt where id ~ '^[0-9]+$') to stdout`,
  ],
  { stdout: "pipe", stderr: "inherit" },
);

let pending = "";
const decoder = new TextDecoder();
for await (const bytes of psql.stdout) {
  const lines = (pending + decoder.decode(bytes, { stream: true })).split("\n");
  pending = lines.pop() ?? "";
  for (const line of lines) {
    const [id, collectionId, serial, mintedAt] = line.split("\t");
    const owner =
      collectionId === undefined
        ? undefined
        : collectionIndex.get(collectionId);
    if (owner === undefined) {
      continue;
    }
    if (size === capacity) {
      grow();
    }
    tokenIds[size] = Number(id);
    serials[size] = Number(serial);
    mintedAts[size] = Number(mintedAt);
    owners[size] = owner;
    size++;
  }
}
await psql.exited;
process.stdout.write(`loaded ${size} objekts\n`);

const byTokenId = Uint32Array.from({ length: size }, (_, index) => index).sort(
  (a, b) => (tokenIds[a] ?? 0) - (tokenIds[b] ?? 0),
);

const ranges = findReservations(
  Array.from(byTokenId)
    .filter((row) => collections[owners[row] ?? -1]?.kind === "sequential")
    .map((row) => tokenIds[row] ?? 0),
  minGap,
);
process.stdout.write(`${ranges.length} reserved ranges (min gap ${minGap})\n`);

function lowerBound(tokenId: number) {
  let low = 0;
  let high = size;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((tokenIds[byTokenId[middle] ?? 0] ?? 0) < tokenId) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

function findRange(tokenId: number): ReservedRange | undefined {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = ranges[middle];
    if (range === undefined) {
      return undefined;
    }
    if (tokenId <= range.lo) {
      high = middle - 1;
    } else if (tokenId >= range.hi) {
      low = middle + 1;
    } else {
      return range;
    }
  }
  return undefined;
}

function reservationsOf(collection: number, objekts: readonly ObjektSerial[]) {
  const found = new Map<number, Reservation>();
  for (const objekt of objekts) {
    const range = findRange(objekt.tokenId);
    if (range === undefined || found.has(range.lo)) {
      continue;
    }
    const foreign: number[] = [];
    for (let position = lowerBound(range.lo + 1); position < size; position++) {
      const row = byTokenId[position] ?? 0;
      const tokenId = tokenIds[row] ?? 0;
      if (tokenId >= range.hi) {
        break;
      }
      if (owners[row] !== collection) {
        foreign.push(tokenId);
      }
    }
    found.set(range.lo, { ...range, foreign });
  }
  return [...found.values()];
}

const rowsByCollection = Map.groupBy(
  Array.from({ length: size }, (_, index) => index),
  (row) => owners[row] ?? -1,
);

type Tally = {
  hidden: number;
  exact: number;
  near: number;
  zero: number;
  errors: Map<number, number>;
};
const tallies = new Map<string, Tally>();
function tally(segment: string): Tally {
  let entry = tallies.get(segment);
  if (entry === undefined) {
    entry = { hidden: 0, exact: 0, near: 0, zero: 0, errors: new Map() };
    tallies.set(segment, entry);
  }
  return entry;
}

const misses: string[] = [];
for (const [collection, rows] of rowsByCollection) {
  const info = collections[collection];
  if (info === undefined) {
    continue;
  }
  const truth = new Map<number, number>();
  const objekts = rows.map((row): ObjektSerial => {
    const tokenId = tokenIds[row] ?? 0;
    const serial = serials[row] ?? 0;
    const mintedAt = mintedAts[row] ?? 0;
    if (mintedAt > cutoff && serial > 0) {
      truth.set(tokenId, serial);
      return { tokenId, serial: 0, mintedAt };
    }
    return { tokenId, serial, mintedAt };
  });
  if (truth.size === 0) {
    continue;
  }

  const input: CollectionObjekts =
    info.kind === "sequential"
      ? { kind: "sequential", objekts }
      : {
          kind: "reserved",
          objekts,
          reservations: reservationsOf(collection, objekts),
        };
  const estimates = new Map(
    estimateSerials(input, new Map(), cutoff).map((update) => [
      update.tokenId,
      update.serial,
    ]),
  );

  const started = Math.min(...objekts.map((objekt) => objekt.mintedAt));
  const segment =
    info.kind === "sequential"
      ? started > cutoff
        ? "digital, started after cutoff"
        : "digital, started before cutoff"
      : info.physical
        ? "physical"
        : "coupon set";
  const entry = tally(segment);
  let missed = 0;
  for (const [tokenId, serial] of truth) {
    const estimate = estimates.get(tokenId) ?? 0;
    entry.hidden++;
    if (estimate === 0) {
      entry.zero++;
      missed++;
      continue;
    }
    const error = estimate - serial;
    if (error === 0) {
      entry.exact++;
    } else {
      missed++;
      if (Math.abs(error) <= 2) {
        entry.near++;
      }
      entry.errors.set(error, (entry.errors.get(error) ?? 0) + 1);
    }
  }
  if (missed > 0) {
    misses.push(`${info.slug}\t${missed}/${truth.size}`);
  }
}

const percent = (part: number, whole: number) =>
  `${((part / whole) * 100).toFixed(2)}%`;
for (const [segment, entry] of tallies) {
  const commonErrors = [...entry.errors]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([error, count]) => `${error > 0 ? "+" : ""}${error}×${count}`)
    .join(" ");
  process.stdout.write(
    [
      `${segment}: ${entry.hidden} hidden`,
      `  exact ${percent(entry.exact, entry.hidden)}, within ±2 ${percent(entry.exact + entry.near, entry.hidden)}, left at 0 ${percent(entry.zero, entry.hidden)}`,
      `  most common errors: ${commonErrors}`,
      "",
    ].join("\n"),
  );
}

if (process.env.MISSES) {
  await Bun.write(process.env.MISSES, `${misses.join("\n")}\n`);
}
