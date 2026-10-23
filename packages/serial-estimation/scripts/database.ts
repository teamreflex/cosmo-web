import {
  collections,
  objekts,
  serialConfirmations,
  serialReservations,
} from "@apollo/database/indexer/schema";
import { SQL } from "bun";
import { and, eq, gt, gte, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import * as z from "zod";
import {
  claimBlocks,
  collectionKind,
  type CollectionObjekts,
  findRange,
  type Reservation,
  type ReservedRange,
  type SerialUpdate,
} from "../src";

/**
 * Drizzle queries the scripts share, against INDEXER_DATABASE_URL.
 */
export const { INDEXER_DATABASE_URL } = z
  .object({ INDEXER_DATABASE_URL: z.url() })
  .parse(process.env);
export const client = new SQL({ url: INDEXER_DATABASE_URL });
export const db = drizzle({ client });

export type CollectionRef = {
  id: string;
  slug: string;
  onOffline: "online" | "offline";
};

export const collectionColumns = {
  id: collections.id,
  slug: collections.slug,
  onOffline: collections.onOffline,
};

const tokenId = sql`${objekts.id}::int4`.mapWith(Number);

/**
 * The rows of a query copied out through `psql`, split into fields. Streams
 * them, so tables of 20M+ rows never sit in memory as text.
 */
export async function* copyRows(query: string): AsyncGenerator<string[]> {
  const psql = Bun.spawn(
    ["psql", INDEXER_DATABASE_URL, "-c", `\\copy (${query}) to stdout`],
    { stdout: "pipe", stderr: "inherit" },
  );
  let pending = "";
  const decoder = new TextDecoder();
  for await (const bytes of psql.stdout) {
    const lines = (pending + decoder.decode(bytes, { stream: true })).split(
      "\n",
    );
    pending = lines.pop() ?? "";
    for (const line of lines) {
      yield line.split("\t");
    }
  }
  if ((await psql.exited) !== 0) {
    throw new Error("psql failed");
  }
}

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
async function loadReservations(
  collectionId: string,
  tokenIds: readonly number[],
): Promise<Reservation[]> {
  if (tokenIds.length === 0) {
    return [];
  }
  const ranges = await db
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
      : (
          await db
            .select({ tokenId })
            .from(objekts)
            .where(and(ne(objekts.collectionId, collectionId), or(...inside)))
        ).map((row) => row.tokenId);

  return Promise.all(
    [...spans.values()].map(async (span): Promise<Reservation> => {
      // one id outside its span marks the range shared
      const outside = [
        span.min > span.lo + 1 && tokenIdBetween(span.lo + 1, span.min - 1),
        span.max < span.hi - 1 && tokenIdBetween(span.max + 1, span.hi - 1),
      ].filter((condition) => condition !== false);
      const [witness] =
        outside.length === 0
          ? []
          : await db
              .select({ tokenId })
              .from(objekts)
              .where(
                and(ne(objekts.collectionId, collectionId), or(...outside)),
              )
              .limit(1);
      const foreign = between.filter((id) => id > span.min && id < span.max);
      return {
        lo: span.lo,
        hi: span.hi,
        shared: foreign.length > 0 || witness !== undefined,
        foreign,
      };
    }),
  );
}

/**
 * A collection's objekts as the estimator needs them, with its reservations
 * when it is numbered by them. `maxTokenId` trims the collection to the
 * objekts up to that id.
 */
export async function loadCollection(
  collection: CollectionRef,
  maxTokenId = Number.POSITIVE_INFINITY,
): Promise<CollectionObjekts> {
  const rows = (
    await db
      .select({
        tokenId,
        serial: objekts.serial,
        mintedAt: sql`extract(epoch from ${objekts.mintedAt}) * 1000`.mapWith(
          Number,
        ),
      })
      .from(objekts)
      .where(eq(objekts.collectionId, collection.id))
  ).filter((objekt) => objekt.tokenId <= maxTokenId);

  return collectionKind(collection.slug, collection.onOffline) === "sequential"
    ? {
        kind: "sequential",
        objekts: rows,
        claimBlocks: claimBlocks(collection.slug),
      }
    : {
        kind: "reserved",
        objekts: rows,
        reservations: await loadReservations(
          collection.id,
          rows.map((objekt) => objekt.tokenId),
        ),
      };
}

/**
 * Every confirmed serial, keyed by token id.
 */
export async function loadConfirmations(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      tokenId: sql`${serialConfirmations.tokenId}::int4`.mapWith(Number),
      serial: serialConfirmations.serial,
    })
    .from(serialConfirmations);
  return new Map(rows.map((row) => [row.tokenId, row.serial]));
}

export async function findCollection(slug: string): Promise<CollectionRef> {
  const [collection] = await db
    .select(collectionColumns)
    .from(collections)
    .where(eq(collections.slug, slug));
  if (collection === undefined) {
    throw new Error(`unknown collection ${slug}`);
  }
  return collection;
}

/**
 * Collections with an objekt minted after `cutoff`, the only ones holding
 * estimates.
 */
export async function collectionsMintedSince(
  cutoff: number,
): Promise<CollectionRef[]> {
  const minted = db
    .selectDistinct({ collectionId: objekts.collectionId })
    .from(objekts)
    .where(gt(objekts.mintedAt, new Date(cutoff).toISOString()))
    .as("minted");
  return db
    .select(collectionColumns)
    .from(collections)
    .innerJoin(minted, eq(minted.collectionId, collections.id))
    .orderBy(collections.id);
}

/**
 * Write serials in one statement.
 */
export async function writeSerials(updates: readonly SerialUpdate[]) {
  await db
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
}
