import {
  collectionKind,
  estimateSerials,
  RESERVATION_MIN_GAP,
  SERIAL_CUTOFF,
  type CollectionObjekts,
  type ObjektSerial,
  type Reservation,
  type ReservedRange,
} from "@apollo/serial-estimation";
import type { Store } from "@subsquid/typeorm-store";
import type { EntityManager } from "typeorm";
import * as z from "zod";
import type { Collection, Objekt } from "./model";
import type { ProcessorContext } from "./processor";

/**
 * Serials for objekts minted after COSMO's v1 metadata cutoff, set on each
 * new objekt before it is inserted, using @apollo/serial-estimation. Existing
 * rows are never renumbered here; apps/schedules recomputes collections daily
 * and applies confirmed serials.
 *
 * - A digital mint above its collection's highest token id takes the next
 *   serial.
 * - Any other new objekt (physical scans, coupon redemptions, late digital
 *   mints, collections not yet cached) is estimated from its whole
 *   collection, and only the new objekts keep the result.
 */

type CollectionRef = {
  id: string;
  slug: string;
  onOffline: "online" | "offline";
};

type Top = { tokenId: number; serial: number };

/**
 * The highest token id in each digital collection and its serial, so a new
 * mint above it is numbered without loading the collection. Checked against
 * the stored serial before use, since apps/schedules may renumber it.
 * Cleared when a batch starts at or below a height already processed, which
 * is a hot-block rollback.
 */
const tops = new Map<string, Top>();

/**
 * The highest token id minted in a digital collection numbered in token-id
 * order. A mint that lands RESERVATION_MIN_GAP or more above it opens a
 * reserved range.
 */
let frontier: number | undefined;
let lastHeight = -1;

/**
 * subsquid's Store only exposes entity reads and writes. Estimating needs a
 * few column-level reads in the batch transaction, so it borrows the store's
 * EntityManager.
 */
function manager(ctx: ProcessorContext<Store>): EntityManager {
  return ctx.store["em"]();
}

const objektRows = z.array(
  z
    .object({
      token_id: z.coerce.number(),
      serial: z.coerce.number(),
      minted_at: z.coerce.number(),
    })
    .transform((row): ObjektSerial => ({
      tokenId: row.token_id,
      serial: row.serial,
      mintedAt: row.minted_at,
    })),
);
const rangeRows = z.array(
  z.object({ lo: z.coerce.number(), hi: z.coerce.number() }),
);
const tokenIdRows = z.array(z.object({ token_id: z.coerce.number() }));
const serialRows = z.array(z.object({ serial: z.coerce.number() }));
const confirmationRows = z.array(
  z.object({ token_id: z.coerce.number(), serial: z.coerce.number() }),
);
const recentMintRows = z.array(
  z.object({
    token_id: z.coerce.number(),
    slug: z.string(),
    on_offline: z.enum(["online", "offline"]),
  }),
);

type IdCondition = { sql: string; parameters: string[] };

/**
 * A SQL condition matching objekt ids in any of the inclusive token-id
 * ranges, with its parameters numbered from `offset`. Objekt ids are varchar,
 * and ids of equal length compare as text in numeric order, so each range
 * splits into primary-key range scans by digit count.
 */
function tokenIdRanges(
  ranges: readonly { from: number; to: number }[],
  offset: number,
): IdCondition {
  const clauses: string[] = [];
  const parameters: string[] = [];
  for (const range of ranges) {
    // split the range wherever the digit count changes
    for (let start = range.from; start <= range.to;) {
      const end = Math.min(range.to, 10 ** String(start).length - 1);
      const index = offset + parameters.length;
      clauses.push(
        `(o.id >= $${index} and o.id <= $${index + 1} and length(o.id) = ${String(start).length})`,
      );
      parameters.push(String(start), String(end));
      start = end + 1;
    }
  }
  return { sql: clauses.join(" or "), parameters };
}

/**
 * The range in `sorted` (ordered by `lo`) holding the token id.
 */
function findRange(sorted: readonly ReservedRange[], tokenId: number) {
  // binary search on the ordered ranges
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = sorted[middle];
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

/**
 * The reserved ranges holding any of the token ids, each with the other
 * collections' ids numbering depends on (see `Reservation`), stored or
 * `pending` in this chunk. Only the span between the collection's own
 * objekts is read in full; one id beyond it is enough to mark the range
 * shared, which keeps wide early ranges cheap.
 */
async function loadReservations(
  em: EntityManager,
  collectionId: string,
  tokenIds: readonly number[],
  pending: readonly number[],
): Promise<Reservation[]> {
  // every range overlapping the collection's id span
  const ranges = rangeRows.parse(
    await em.query(
      `select lo, hi from serial_reservation where lo < $1 and hi > $2 order by lo`,
      [Math.max(...tokenIds), Math.min(...tokenIds)],
    ),
  );

  // the collection's own span in each range it has objekts in
  const spans = new Map<number, ReservedRange & { min: number; max: number }>();
  for (const tokenId of tokenIds) {
    const range = findRange(ranges, tokenId);
    if (range !== undefined) {
      const span = spans.get(range.lo) ?? {
        ...range,
        min: tokenId,
        max: tokenId,
      };
      span.min = Math.min(span.min, tokenId);
      span.max = Math.max(span.max, tokenId);
      spans.set(range.lo, span);
    }
  }

  // other collections' ids between its own
  const inside = tokenIdRanges(
    [...spans.values()]
      .filter((span) => span.max - span.min > 1)
      .map((span) => ({ from: span.min + 1, to: span.max - 1 })),
    2,
  );
  const between =
    inside.parameters.length === 0
      ? []
      : tokenIdRows
          .parse(
            await em.query(
              `select o.id::int4 as token_id from objekt o
               where o.collection_id <> $1 and (${inside.sql})`,
              [collectionId, ...inside.parameters],
            ),
          )
          .map((row) => row.token_id);

  const reservations: Reservation[] = [];
  for (const span of spans.values()) {
    // one id outside its span marks the range shared
    const outside = tokenIdRanges(
      [
        { from: span.lo + 1, to: span.min - 1 },
        { from: span.max + 1, to: span.hi - 1 },
      ],
      2,
    );
    const [witness] =
      outside.parameters.length === 0
        ? []
        : tokenIdRows.parse(
            await em.query(
              `select o.id::int4 as token_id from objekt o
               where o.collection_id <> $1 and (${outside.sql}) limit 1`,
              [collectionId, ...outside.parameters],
            ),
          );
    reservations.push({
      lo: span.lo,
      hi: span.hi,
      foreign: [
        ...between,
        ...pending,
        ...(witness ? [witness.token_id] : []),
      ].filter((tokenId) => tokenId > span.lo && tokenId < span.hi),
    });
  }
  return reservations;
}

/**
 * A collection as stored plus its new objekts from this chunk, with its
 * reservations when it is numbered by them.
 */
async function loadCollection(
  em: EntityManager,
  collection: CollectionRef,
  created: readonly ObjektSerial[],
  pending: readonly number[],
): Promise<CollectionObjekts> {
  // stored objekts plus the chunk's new ones, not inserted yet
  const objekts = [
    ...objektRows.parse(
      await em.query(
        `select id::int4 as token_id, serial, (extract(epoch from minted_at) * 1000)::float8 as minted_at
         from objekt where collection_id = $1`,
        [collection.id],
      ),
    ),
    ...created,
  ];

  // only physicals and coupon sets need their reservations
  return collectionKind(collection.slug, collection.onOffline) === "sequential"
    ? { kind: "sequential", objekts }
    : {
        kind: "reserved",
        objekts,
        reservations: await loadReservations(
          em,
          collection.id,
          objekts.map((objekt) => objekt.tokenId),
          pending,
        ),
      };
}

/**
 * Confirmed serials for a collection's objekts, keyed by token id.
 */
async function loadConfirmations(
  em: EntityManager,
  collectionId: string,
): Promise<Map<number, number>> {
  const rows = confirmationRows.parse(
    await em.query(
      `select c.token_id::int4 as token_id, c.serial
       from serial_confirmation c join objekt o on o.id = c.token_id
       where o.collection_id = $1`,
      [collectionId],
    ),
  );
  return new Map(rows.map((row) => [row.token_id, row.serial]));
}

/**
 * The cached top of a digital collection, if its stored serial still
 * matches.
 */
async function storedTop(
  em: EntityManager,
  collectionId: string,
): Promise<Top | undefined> {
  const top = tops.get(collectionId);
  if (top === undefined) {
    return undefined;
  }

  // apps/schedules may have renumbered it since it was cached
  const [row] = serialRows.parse(
    await em.query(`select serial from objekt where id = $1`, [
      String(top.tokenId),
    ]),
  );
  return row?.serial === top.serial ? top : undefined;
}

/**
 * Estimate the collection with its new objekts added, set their serials, and
 * cache the collection's top when it is digital.
 */
async function estimateNewObjekts(
  em: EntityManager,
  collection: CollectionRef,
  created: readonly Objekt[],
  pending: readonly number[],
) {
  // load the collection with the new objekts at serial 0
  const objekts = await loadCollection(
    em,
    collection,
    created.map((objekt) => ({
      tokenId: Number(objekt.id),
      serial: 0,
      mintedAt: objekt.mintedAt.getTime(),
    })),
    pending,
  );

  // estimate everything, but only the new objekts take the result
  const serials = new Map(
    estimateSerials(objekts, await loadConfirmations(em, collection.id)).map(
      (update) => [update.tokenId, update.serial],
    ),
  );
  for (const objekt of created) {
    objekt.serial = serials.get(Number(objekt.id)) ?? 0;
  }

  // remember a digital collection's top for the next mint
  if (objekts.kind === "sequential") {
    let top: ObjektSerial | undefined;
    for (const objekt of objekts.objekts) {
      if (top === undefined || objekt.tokenId > top.tokenId) {
        top = objekt;
      }
    }
    const serial =
      top === undefined ? 0 : (serials.get(top.tokenId) ?? top.serial);
    if (top !== undefined && serial > 0) {
      tops.set(collection.id, { tokenId: top.tokenId, serial });
    } else {
      tops.delete(collection.id);
    }
  }
}

/**
 * Add a reserved range for every jump of RESERVATION_MIN_GAP or more above
 * the frontier. Mints below the frontier never split a range.
 */
async function openReservations(
  em: EntityManager,
  ctx: ProcessorContext<Store>,
  tokenIds: readonly number[],
) {
  if (tokenIds.length === 0) {
    return;
  }
  // seed the frontier from the most recent mints
  if (frontier === undefined) {
    const recent = recentMintRows.parse(
      await em.query(
        `select o.id::int4 as token_id, c.slug, c.on_offline
         from (select id, collection_id from objekt order by minted_at desc limit 1000) o
         join collection c on c.id = o.collection_id`,
        [],
      ),
    );

    for (const row of recent) {
      if (
        collectionKind(row.slug, row.on_offline) === "sequential" &&
        (frontier === undefined || row.token_id > frontier)
      ) {
        frontier = row.token_id;
      }
    }
  }

  // walk the new mints upwards, opening a range at each jump
  const ranges: ReservedRange[] = [];
  for (const tokenId of [...tokenIds].sort((a, b) => a - b)) {
    if (frontier === undefined || tokenId > frontier) {
      if (frontier !== undefined && tokenId - frontier >= RESERVATION_MIN_GAP) {
        ranges.push({ lo: frontier, hi: tokenId });
      }
      frontier = tokenId;
    }
  }
  if (ranges.length === 0) {
    return;
  }

  // a range already stored under the same lo is kept
  await em.query(
    `insert into serial_reservation (lo, hi)
     select * from unnest($1::int4[], $2::int4[])
     on conflict (lo) do nothing`,
    [ranges.map((range) => range.lo), ranges.map((range) => range.hi)],
  );
  ctx.log.info(
    `Opened ${ranges.length} reserved ranges: ${ranges.map((range) => `${range.lo}-${range.hi}`).join(", ")}`,
  );
}

/**
 * Called before a batch's objekts are processed.
 */
export function startSerialBatch(ctx: ProcessorContext<Store>) {
  // a batch at or below a processed height is a hot-block rollback
  const first = ctx.blocks[0]?.header.height;
  if (first !== undefined && first <= lastHeight) {
    tops.clear();
    frontier = undefined;
  }
  lastHeight = ctx.blocks.at(-1)?.header.height ?? lastHeight;
}

/**
 * Set the serial of each objekt created in a chunk, before the chunk is
 * upserted, and record any reserved range the new digital mints reveal.
 */
export async function numberNewObjekts(
  ctx: ProcessorContext<Store>,
  created: readonly { objekt: Objekt; collection: Collection }[],
) {
  const em = manager(ctx);

  // group the chunk's new objekts by collection
  const byCollection = new Map<
    string,
    { collection: CollectionRef; objekts: Objekt[] }
  >();
  for (const { objekt, collection } of created) {
    const entry = byCollection.get(collection.id) ?? {
      collection: {
        id: collection.id,
        slug: collection.slug,
        onOffline: collection.onOffline === "offline" ? "offline" : "online",
      },
      objekts: [],
    };
    entry.objekts.push(objekt);
    byCollection.set(collection.id, entry);
  }

  // digital mints reveal reserved ranges before anything is estimated
  await openReservations(
    em,
    ctx,
    [...byCollection.values()]
      .filter(
        ({ collection }) =>
          collectionKind(collection.slug, collection.onOffline) ===
          "sequential",
      )
      .flatMap(({ objekts }) => objekts.map((objekt) => Number(objekt.id))),
  );

  for (const { collection, objekts } of byCollection.values()) {
    // only objekts minted after the cutoff need a serial
    const minted = objekts
      .filter((objekt) => objekt.mintedAt.getTime() > SERIAL_CUTOFF)
      .sort((a, b) => Number(a.id) - Number(b.id));

    const [lowest] = minted;
    if (lowest === undefined) {
      continue;
    }

    // digital mints above the cached top continue its count
    const top =
      collectionKind(collection.slug, collection.onOffline) === "sequential"
        ? await storedTop(em, collection.id)
        : undefined;
    if (top !== undefined && Number(lowest.id) > top.tokenId) {
      for (const objekt of minted) {
        top.tokenId = Number(objekt.id);
        top.serial += 1;
        objekt.serial = top.serial;
      }
      continue;
    }

    // everything else is estimated from the whole collection
    await estimateNewObjekts(
      em,
      collection,
      minted,
      created
        .filter((entry) => entry.collection.id !== collection.id)
        .map((entry) => Number(entry.objekt.id)),
    );
  }
}
