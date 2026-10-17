import { DatabaseIndexer } from "@/db-indexer";
import {
  collections,
  objekts,
  serialConfirmations,
  serialReservations,
} from "@apollo/database/indexer/schema";
import {
  claimBlocks,
  collectionKind,
  estimateSerials,
  findRange,
  type CollectionObjekts,
  type Reservation,
  type ReservedRange,
  type SerialUpdate,
} from "@apollo/serial-estimation";
import { and, eq, gt, gte, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import { Duration, Effect } from "effect";
import type { ScheduledTask } from "../task";

type CollectionRef = {
  id: string;
  slug: string;
  onOffline: "online" | "offline";
};

/**
 * Rows per serial update statement, and the pause between statements so a
 * large rewrite doesn't outrun WAL shipping and vacuum.
 */
const WRITE_BATCH = 1000;
const WRITE_PAUSE = Duration.millis(250);

const tokenId = sql`${objekts.id}::int4`.mapWith(Number);

export const collectionColumns = {
  id: collections.id,
  slug: collections.slug,
  onOffline: collections.onOffline,
};

/**
 * Objekt ids are varchar. Ids of equal length compare as text in numeric
 * order, so an inclusive token-id range becomes primary-key range scans, one
 * per digit count it spans, each guarded by length.
 */
function tokenIdBetween(from: number, to: number) {
  const spans = [];
  for (let start = from; start <= to;) {
    const end = Math.min(to, 10 ** String(start).length - 1);
    spans.push(
      and(
        gte(objekts.id, String(start)),
        lte(objekts.id, String(end)),
        eq(sql`length(${objekts.id})`, String(start).length),
      ),
    );
    start = end + 1;
  }
  return or(...spans);
}

/**
 * The reserved ranges holding any of the token ids, as the collection sees
 * them (see `Reservation`). Only the span between the collection's own
 * objekts is read in full; one id beyond it is enough to mark the range
 * shared, which keeps wide early ranges cheap.
 */
const loadReservations = Effect.fn("loadReservations")(function* (
  collectionId: string,
  tokenIds: readonly number[],
) {
  const db = yield* DatabaseIndexer;
  const ranges = yield* db
    .select({ lo: serialReservations.lo, hi: serialReservations.hi })
    .from(serialReservations)
    .where(
      and(
        lt(serialReservations.lo, Math.max(...tokenIds)),
        gt(serialReservations.hi, Math.min(...tokenIds)),
      ),
    )
    .orderBy(serialReservations.lo);

  // the collection's own span in each range it has objekts in
  const spans = new Map<number, ReservedRange & { min: number; max: number }>();
  for (const id of tokenIds) {
    const range = findRange(ranges, id);
    if (range !== undefined) {
      const span = spans.get(range.lo) ?? { ...range, min: id, max: id };
      span.min = Math.min(span.min, id);
      span.max = Math.max(span.max, id);
      spans.set(range.lo, span);
    }
  }

  // other collections' ids between its own
  const inside = [...spans.values()]
    .filter((span) => span.max - span.min > 1)
    .map((span) => tokenIdBetween(span.min + 1, span.max - 1));
  const between =
    inside.length === 0
      ? []
      : (yield* db
          .select({ tokenId })
          .from(objekts)
          .where(
            and(ne(objekts.collectionId, collectionId), or(...inside)),
          )).map((row) => row.tokenId);

  const reservations: Reservation[] = [];
  for (const span of spans.values()) {
    // one id outside its span marks the range shared
    const outside = [
      span.min > span.lo + 1 && tokenIdBetween(span.lo + 1, span.min - 1),
      span.max < span.hi - 1 && tokenIdBetween(span.max + 1, span.hi - 1),
    ].filter((condition) => condition !== false);
    const [witness] =
      outside.length === 0
        ? []
        : yield* db
            .select({ tokenId })
            .from(objekts)
            .where(and(ne(objekts.collectionId, collectionId), or(...outside)))
            .limit(1);
    const foreign = between.filter((id) => id > span.min && id < span.max);
    reservations.push({
      lo: span.lo,
      hi: span.hi,
      shared: foreign.length > 0 || witness !== undefined,
      foreign,
    });
  }
  return reservations;
});

/**
 * A collection's objekts as the estimator needs them, with its reservations
 * when it is numbered by them.
 */
const loadCollection = Effect.fn("loadCollection")(function* (
  collection: CollectionRef,
) {
  const db = yield* DatabaseIndexer;
  const rows = yield* db
    .select({
      tokenId,
      serial: objekts.serial,
      mintedAt: sql`extract(epoch from ${objekts.mintedAt}) * 1000`.mapWith(
        Number,
      ),
    })
    .from(objekts)
    .where(eq(objekts.collectionId, collection.id));

  if (collectionKind(collection.slug, collection.onOffline) === "sequential") {
    return {
      kind: "sequential",
      objekts: rows,
      claimBlocks: claimBlocks(collection.slug),
    } satisfies CollectionObjekts;
  }
  return {
    kind: "reserved",
    objekts: rows,
    reservations: yield* loadReservations(
      collection.id,
      rows.map((objekt) => objekt.tokenId),
    ),
  } satisfies CollectionObjekts;
});

/**
 * Every confirmed serial, keyed by token id. The table holds only what staff
 * have confirmed, so one read serves every collection in a run.
 */
const loadConfirmations = Effect.fn("loadConfirmations")(function* () {
  const db = yield* DatabaseIndexer;
  const rows = yield* db
    .select({
      tokenId: sql`${serialConfirmations.tokenId}::int4`.mapWith(Number),
      serial: serialConfirmations.serial,
    })
    .from(serialConfirmations);
  return new Map(rows.map((row) => [row.tokenId, row.serial]));
});

/**
 * Write serials in one statement.
 */
const writeSerials = Effect.fn("writeSerials")(function* (
  updates: readonly SerialUpdate[],
) {
  const db = yield* DatabaseIndexer;
  yield* db
    .update(objekts)
    .set({
      serial: sql`case ${objekts.id} ${sql.join(
        updates.map(
          (update) =>
            sql`when ${String(update.tokenId)} then ${update.serial}::int4`,
        ),
        sql` `,
      )} end`,
    })
    .where(
      inArray(
        objekts.id,
        updates.map((update) => String(update.tokenId)),
      ),
    );
});

/**
 * Re-estimate whole collections from what is stored and write the serials
 * that differ, in token-id order. Estimating from what is stored makes it
 * idempotent: a write lost to the indexer's upsert of a stale objekt is
 * redone on the next run. Returns how many serials changed.
 */
export const recomputeCollections = Effect.fn("recomputeCollections")(
  function* (refs: readonly CollectionRef[]) {
    const confirmations = yield* loadConfirmations();
    const updates: SerialUpdate[] = [];
    for (const collection of refs) {
      updates.push(
        ...estimateSerials(yield* loadCollection(collection), confirmations),
      );
    }

    updates.sort((a, b) => a.tokenId - b.tokenId);
    for (let index = 0; index < updates.length; index += WRITE_BATCH) {
      if (index > 0) {
        yield* Effect.sleep(WRITE_PAUSE);
      }
      yield* writeSerials(updates.slice(index, index + WRITE_BATCH));
    }
    return updates.length;
  },
);

/**
 * How far back a daily run looks for new objekts:
 * a day, plus an hour of slack for a run that starts late.
 */
const DAILY_WINDOW = Duration.hours(25);

/**
 * Re-estimate every collection with an objekt minted in the last day.
 */
export const recomputeSerialsTask = {
  name: "recompute-serials",
  cron: "0 8 * * *",
  timezone: "Pacific/Auckland",
  runAtBoot: false,
  effect: Effect.gen(function* () {
    const db = yield* DatabaseIndexer;
    const minted = db
      .selectDistinct({ collectionId: objekts.collectionId })
      .from(objekts)
      .where(
        gt(
          objekts.mintedAt,
          new Date(Date.now() - Duration.toMillis(DAILY_WINDOW)).toISOString(),
        ),
      )
      .as("minted");
    const refs = yield* db
      .select(collectionColumns)
      .from(collections)
      .innerJoin(minted, eq(minted.collectionId, collections.id));

    const started = Date.now();
    const changed = yield* recomputeCollections(refs);
    yield* Effect.logInfo(
      `Recomputed serials for ${refs.length} collections: ${changed} changed in ${Math.round((Date.now() - started) / 1000)}s`,
    );
  }),
} satisfies ScheduledTask;
