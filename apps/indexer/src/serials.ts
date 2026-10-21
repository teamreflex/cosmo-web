import {
  claimBlocks,
  collectionKind,
  estimateSerials,
  findRange,
  findReservations,
  SERIAL_CUTOFF,
  type CollectionObjekts,
  type ObjektSerial,
  type Reservation,
  type ReservedRange,
  type SerialUpdate,
} from "@apollo/serial-estimation";
import type { Store } from "@subsquid/typeorm-store";
import { In, type EntityManager } from "typeorm";
import * as z from "zod";
import { Objekt, type Collection } from "./model";
import type { ProcessorContext } from "./processor";

/**
 * Serials for objekts minted after COSMO's v1 metadata cutoff, set on each
 * new objekt before it is inserted, using @apollo/serial-estimation.
 * apps/schedules recomputes collections with new objekts daily and applies
 * confirmed serials.
 *
 * - A digital mint above its collection's highest token id takes the next
 *   serial.
 * - Any other new objekt (physical scans, coupon redemptions, late digital
 *   mints, collections not yet cached) is estimated from its whole
 *   collection. The new objekts take the result, and so do a digital
 *   collection's stored objekts whose serial it changed: a mint landing
 *   on-chain after higher ids in its collection shifts every one above it.
 */

type CollectionRef = {
  id: string;
  slug: string;
  kind: CollectionObjekts["kind"];
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
  z.object({
    token_id: z.coerce.number(),
    serial: z.coerce.number(),
    minted_at: z.coerce.number(),
    confirmed: z.coerce.number().nullable(),
  }),
);
const rangeRows = z.array(
  z.object({ lo: z.coerce.number(), hi: z.coerce.number() }),
);
const tokenIdRows = z.array(z.object({ token_id: z.coerce.number() }));
const serialRows = z.array(
  z.object({ token_id: z.coerce.number(), serial: z.coerce.number() }),
);
const recentMintRows = z.array(
  z.object({
    token_id: z.coerce.number(),
    slug: z.string(),
    on_offline: z.enum(["online", "offline"]),
  }),
);

/**
 * A SQL condition matching objekt ids in any of the inclusive token-id
 * ranges, with its parameters numbered from $2 after the collection id.
 * Objekt ids are varchar, and ids of equal length compare as text in numeric
 * order, so each range splits into primary-key range scans by digit count.
 */
function tokenIdRanges(ranges: readonly { from: number; to: number }[]) {
  const clauses: string[] = [];
  const parameters: string[] = [];
  for (const range of ranges) {
    // split the range wherever the digit count changes
    for (let start = range.from; start <= range.to;) {
      const end = Math.min(range.to, 10 ** String(start).length - 1);
      const index = 2 + parameters.length;
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
 * The reserved ranges holding any of the token ids, as the collection sees
 * them (see `Reservation`), counting other collections' objekts both stored
 * and `pending` in this chunk. Only the span between the collection's own
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
    const outside = tokenIdRanges([
      { from: span.lo + 1, to: span.min - 1 },
      { from: span.max + 1, to: span.hi - 1 },
    ]);
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
    const foreign = [...between, ...pending].filter(
      (tokenId) => tokenId > span.min && tokenId < span.max,
    );
    reservations.push({
      lo: span.lo,
      hi: span.hi,
      shared:
        foreign.length > 0 ||
        witness !== undefined ||
        pending.some((tokenId) => tokenId > span.lo && tokenId < span.hi),
      foreign,
    });
  }
  return reservations;
}

/**
 * A collection's objekts with its reservations when it is numbered by them.
 */
async function loadCollection(
  em: EntityManager,
  collection: CollectionRef,
  objekts: readonly ObjektSerial[],
  pending: readonly number[],
): Promise<CollectionObjekts> {
  // only physicals and coupon sets need their reservations
  return collection.kind === "sequential"
    ? {
        kind: "sequential",
        objekts,
        claimBlocks: claimBlocks(collection.slug),
      }
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
 * The cached tops of these collections whose stored serial still matches,
 * since apps/schedules may have renumbered them since they were cached.
 */
async function storedTops(
  em: EntityManager,
  collectionIds: readonly string[],
): Promise<Map<string, Top>> {
  const cached = collectionIds.flatMap((id): [string, Top][] => {
    const top = tops.get(id);
    return top === undefined ? [] : [[id, top]];
  });
  if (cached.length === 0) {
    return new Map();
  }

  const stored = new Map(
    serialRows
      .parse(
        await em.query(
          `select id::int4 as token_id, serial from objekt where id = any($1::text[])`,
          [cached.map(([, top]) => String(top.tokenId))],
        ),
      )
      .map((row) => [row.token_id, row.serial]),
  );
  return new Map(
    cached.filter(([, top]) => stored.get(top.tokenId) === top.serial),
  );
}

/**
 * Estimate the collection with its new objekts added, set their serials, and
 * cache the collection's top when it is digital. Returns the new serials of
 * a digital collection's stored objekts whose estimate changed.
 */
async function estimateNewObjekts(
  em: EntityManager,
  collection: CollectionRef,
  created: readonly Objekt[],
  pending: readonly number[],
): Promise<SerialUpdate[]> {
  // the stored collection with its confirmed serials
  const rows = objektRows.parse(
    await em.query(
      `select o.id::int4 as token_id, o.serial, (extract(epoch from o.minted_at) * 1000)::float8 as minted_at, c.serial as confirmed
       from objekt o left join serial_confirmation c on c.token_id = o.id
       where o.collection_id = $1`,
      [collection.id],
    ),
  );

  // estimate it with the new objekts at serial 0
  const objekts = await loadCollection(
    em,
    collection,
    [
      ...rows.map((row) => ({
        tokenId: row.token_id,
        serial: row.serial,
        mintedAt: row.minted_at,
      })),
      ...created.map((objekt) => ({
        tokenId: Number(objekt.id),
        serial: 0,
        mintedAt: objekt.mintedAt.getTime(),
      })),
    ],
    pending,
  );
  const updates = estimateSerials(
    objekts,
    new Map(
      rows.flatMap((row): [number, number][] =>
        row.confirmed === null ? [] : [[row.token_id, row.confirmed]],
      ),
    ),
  );
  const serials = new Map(
    updates.map((update) => [update.tokenId, update.serial]),
  );
  for (const objekt of created) {
    objekt.serial = serials.get(Number(objekt.id)) ?? 0;
  }

  /**
   * Physicals keep their stored serials. They are numbered from reserved
   * ranges, which are least reliable during a drop: a digital mint landing
   * before a lower batch opens a range that the batch splits again seconds
   * later. A digital mint in another collection can also split a physical's
   * range without the physical being in the chunk, so apps/schedules repairs
   * them instead.
   */
  if (objekts.kind !== "sequential") {
    return [];
  }

  // remember the collection's top for the next mint
  const top = objekts.objekts.reduce((a, b) => (b.tokenId > a.tokenId ? b : a));
  const serial = serials.get(top.tokenId) ?? top.serial;
  if (serial > 0) {
    tops.set(collection.id, { tokenId: top.tokenId, serial });
  } else {
    tops.delete(collection.id);
  }

  // stored objekts whose serial changed, such as every one above a late mint
  const stored = new Set(rows.map((row) => row.token_id));
  return updates.filter((update) => stored.has(update.tokenId));
}

/**
 * Write the changed serials of stored objekts. Goes through the store so a
 * hot-block rollback restores them, and sets them on the chunk's own
 * instances too, since its upsert would otherwise write the old serials
 * back. Rows are written in token-id order, the order apps/schedules writes
 * serials in, so the two lock overlapping rows in the same order.
 */
async function renumberStored(
  ctx: ProcessorContext<Store>,
  updates: readonly SerialUpdate[],
  buffered: ReadonlyMap<string, Objekt>,
) {
  if (updates.length === 0) {
    return;
  }

  const unbuffered = updates
    .map((update) => String(update.tokenId))
    .filter((id) => !buffered.has(id));
  const loaded = new Map(
    (unbuffered.length === 0
      ? []
      : await ctx.store.find(Objekt, { where: { id: In(unbuffered) } })
    ).map((objekt) => [objekt.id, objekt]),
  );
  for (const update of updates) {
    const id = String(update.tokenId);
    const objekt = buffered.get(id) ?? loaded.get(id);
    if (objekt !== undefined) {
      objekt.serial = update.serial;
    }
  }
  await ctx.store.upsert(
    [...loaded.values()].sort((a, b) => Number(a.id) - Number(b.id)),
  );
  ctx.log.info(`Renumbered ${updates.length} stored objekts`);
}

/**
 * Keep serial_reservation equal to findReservations over every digital mint
 * so far. A jump of RESERVATION_MIN_GAP or more above the frontier opens a
 * range. A late mint below the frontier, minted after ids above it, splits
 * the stored range it lands in, as it would sit between them in token-id
 * order.
 */
async function updateReservations(
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
  const previous = frontier;

  // each jump between the frontier and the new mints above it opens a range
  const above = tokenIds
    .filter((tokenId) => previous === undefined || tokenId > previous)
    .sort((a, b) => a - b);
  const opened = findReservations(
    previous === undefined ? above : [previous, ...above],
  );
  frontier = above.at(-1) ?? previous;

  // stored ranges holding a late mint, each with the late mints inside it
  const late =
    previous === undefined
      ? []
      : tokenIds.filter((tokenId) => tokenId < previous);
  const split =
    late.length === 0
      ? []
      : rangeRows.parse(
          await em.query(
            `select distinct r.lo, r.hi
             from serial_reservation r join unnest($1::int4[]) t(id) on r.lo < t.id and r.hi > t.id
             order by r.lo`,
            [late],
          ),
        );
  const remaining = split.flatMap((range) =>
    findReservations([
      range.lo,
      ...late
        .filter((tokenId) => tokenId > range.lo && tokenId < range.hi)
        .sort((a, b) => a - b),
      range.hi,
    ]),
  );

  // replace the split ranges, then add the new ones
  if (split.length > 0) {
    await em.query(
      `delete from serial_reservation where lo = any($1::int4[])`,
      [split.map((range) => range.lo)],
    );
    ctx.log.info(
      `Split ${split.length} reserved ranges with late mints: ${split.map((range) => `${range.lo}-${range.hi}`).join(", ")} kept ${remaining.map((range) => `${range.lo}-${range.hi}`).join(", ") || "none"}`,
    );
  }
  const ranges = [...opened, ...remaining];
  if (ranges.length > 0) {
    await em.query(
      `insert into serial_reservation (lo, hi)
       select * from unnest($1::int4[], $2::int4[])
       on conflict (lo) do nothing`,
      [ranges.map((range) => range.lo), ranges.map((range) => range.hi)],
    );
  }
  if (opened.length > 0) {
    ctx.log.info(
      `Opened ${opened.length} reserved ranges: ${opened.map((range) => `${range.lo}-${range.hi}`).join(", ")}`,
    );
  }
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
 * upserted, and update the reserved ranges from the new digital mints.
 */
export async function numberNewObjekts(
  ctx: ProcessorContext<Store>,
  created: readonly { objekt: Objekt; collection: Collection }[],
  buffered: ReadonlyMap<string, Objekt>,
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
        kind: collectionKind(
          collection.slug,
          collection.onOffline === "offline" ? "offline" : "online",
        ),
      },
      objekts: [],
    };
    entry.objekts.push(objekt);
    byCollection.set(collection.id, entry);
  }

  // digital mints update the reserved ranges before anything is estimated
  await updateReservations(
    em,
    ctx,
    [...byCollection.values()]
      .filter(({ collection }) => collection.kind === "sequential")
      .flatMap(({ objekts }) => objekts.map((objekt) => Number(objekt.id))),
  );

  // cached tops of the chunk's digital collections, checked in one read
  const checkedTops = await storedTops(
    em,
    [...byCollection.values()]
      .filter(({ collection }) => collection.kind === "sequential")
      .map(({ collection }) => collection.id),
  );

  const shifted: SerialUpdate[] = [];
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
    const top = checkedTops.get(collection.id);
    if (top !== undefined && Number(lowest.id) > top.tokenId) {
      for (const objekt of minted) {
        top.tokenId = Number(objekt.id);
        top.serial += 1;
        objekt.serial = top.serial;
      }
      continue;
    }

    // everything else is estimated from the whole collection
    shifted.push(
      ...(await estimateNewObjekts(
        em,
        collection,
        minted,
        created
          .filter((entry) => entry.collection.id !== collection.id)
          .map((entry) => Number(entry.objekt.id)),
      )),
    );
  }

  await renumberStored(ctx, shifted, buffered);
}
