import { redis } from "@/lib/server/cache";
import { indexer } from "@/lib/server/db/indexer";
import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { userCollectionBackendSchema } from "@/lib/universal/parsers";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import * as z from "zod";
import {
  withArtist,
  withClass,
  withCollectionSort,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
  withTransferable,
} from "../filters";
import { mapLegacyObjekt } from "./common";

/**
 * this is a complete shitshow because the @cosmo-spin account doesn't get emptied, it just keeps growing (3.2m rows at the time of writing)
 * querying against the objekts table is generally quick, but falls apart when filtering the collections table.
 *
 * so, i'm instead splitting the query into two branches:
 * 1. collection-first query: used when filters are applied to the collections table
 *   - queries through the collections table meaning the result set should be smaller due to filtering
 * 2. objekt-first query: when there's no selective filters applied to the collections table
 *   - queries through the objekts table can be reliably indexed due to there only being three filter/sort options (received_at, transferable and serial)
 *
 * to handle the total count query, this has a stale-while-revalidate style caching strategy when querying the spin account,
 * otherwise it just executes the count query against the database.
 * the solution here for managing the count is terrible but it at least handles the worst case.
 */

const PER_PAGE = 60;
const LIMIT_FENCE = 1_000_000_000; // arbitrary limit to prevent subquery inlining
const COUNT_STALE_AFTER = 60 * 60 * 72; // 72 hours - revalidate after this
const COUNT_CACHE_TTL = 60 * 60 * 24 * 7; // 1 week - keep stale data as fallback

const schema = userCollectionBackendSchema.extend({
  address: z.string().min(1),
});
type InputData = z.infer<typeof schema>;

/**
 * Fetch a user's objekts from the indexer with given filters.
 */
export const $fetchObjektsBlockchain = createServerFn({ method: "GET" })
  .inputValidator(schema)
  .handler(async ({ data }) => {
    const isSpin = isEqual(data.address, Addresses.SPIN);

    // works around the @cosmo-spin account causing massive seqscans
    const useCollectionFirst =
      hasCollectionFilters(data) && isObjektSort(data.sort);

    // fetch both objekts and total count in parallel
    const [total, results] = await Promise.all([
      // counts for @cosmo-spin get cached
      isSpin
        ? fetchCachedCount(data.address, data)
        : executeCountQuery(data.address, data),
      // different query strategies for different filter cases
      useCollectionFirst
        ? executeCollectionFirst(data)
        : executeObjektFirst(data),
    ]);

    const hasNext = results.length === PER_PAGE;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total,
      hasNext,
      nextStartAfter,
      objekts: results.map((row) =>
        mapLegacyObjekt(row.objekts, row.collections),
      ),
    };
  });

type QueryResult = {
  objekts: Objekt;
  collections: Collection;
};

/**
 * Execute a collection-first query using LIMIT fence optimization.
 * This forces Postgres to materialize the collection filter results first,
 * then join to objekts using the (owner, collection_id) index.
 */
async function executeCollectionFirst(data: InputData): Promise<QueryResult[]> {
  // subquery: get matching collection IDs with LIMIT fence to prevent inlining
  const filteredCollections = indexer
    .select({ id: collections.id })
    .from(collections)
    .where(and(...collectionFilters(data)))
    .limit(LIMIT_FENCE)
    .as("fc");

  // main query: join filtered collections to objekts
  let query = indexer
    .select({ objekts, collections })
    .from(filteredCollections)
    .innerJoin(collections, eq(collections.id, filteredCollections.id))
    .innerJoin(
      objekts,
      and(
        eq(objekts.owner, data.address.toLowerCase()),
        eq(objekts.collectionId, collections.id),
      ),
    )
    .where(and(...withTransferable(data.transferable)))
    .$dynamic();

  query = withCollectionSort(query, data.sort ?? "newest");
  query = query.limit(PER_PAGE).offset(data.page * PER_PAGE);

  return await query;
}

/**
 * Execute the objekt-first query.
 */
async function executeObjektFirst(data: InputData): Promise<QueryResult[]> {
  let query = indexer
    .select({ objekts, collections })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, data.address.toLowerCase()),
        ...collectionFilters(data),
        ...withTransferable(data.transferable),
      ),
    )
    .$dynamic();

  query = withCollectionSort(query, data.sort ?? "newest");
  query = query.limit(PER_PAGE).offset(data.page * PER_PAGE);

  return await query;
}

const cachedCountSchema = z.object({
  count: z.number(),
  timestamp: z.number(),
});

/**
 * Fetch the total number of objekts for a user with given filters.
 * Uses SWR-style caching: returns cached value immediately if fresh,
 * revalidates if stale.
 */
async function fetchCachedCount(
  address: string,
  filters: InputData,
): Promise<number> {
  const cacheKey = buildCountCacheKey(address, filters);

  try {
    // check cache first
    const cached = await redis.get(cacheKey);
    const cachedData = cachedCountSchema.safeParse(
      cached ? JSON.parse(cached) : null,
    );

    const now = Date.now();
    const isStale =
      !cachedData.success ||
      now - cachedData.data.timestamp > COUNT_STALE_AFTER * 1000;

    // if cache is fresh, return immediately without querying
    if (cachedData.success && !isStale) {
      return cachedData.data.count;
    }

    // cache is stale or missing - refresh
    const count = await executeCountQuery(address, filters);
    const freshData = { count, timestamp: now };
    await redis.setex(cacheKey, COUNT_CACHE_TTL, JSON.stringify(freshData));
    return count;
  } catch {
    // suppress errors - try to return cached value
    try {
      const cached = await redis.get(cacheKey);
      const cachedData = cachedCountSchema.safeParse(
        cached ? JSON.parse(cached) : null,
      );
      if (cachedData.success) {
        return cachedData.data.count;
      }
    } catch {
      // ignore redis errors
    }
    return 0;
  }
}

/**
 * Execute the count query against the database.
 */
async function executeCountQuery(
  address: string,
  filters: InputData,
): Promise<number> {
  const [results] = await indexer
    .select({ count: sql<number>`count(*)` })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, address.toLowerCase()),
        ...collectionFilters(filters),
        ...withTransferable(filters.transferable),
      ),
    );

  return Number(results?.count ?? 0);
}

/**
 * Build a cache key for the count query based on address and filters.
 */
function buildCountCacheKey(address: string, filters: InputData): string {
  const parts = [
    address.toLowerCase(),
    filters.artist ?? "",
    [...filters.artists].sort((a, b) => a.localeCompare(b)).join(","),
    [...(filters.class ?? [])].sort((a, b) => a.localeCompare(b)).join(","),
    [...(filters.season ?? [])].sort((a, b) => a.localeCompare(b)).join(","),
    [...(filters.on_offline ?? [])]
      .sort((a, b) => a.localeCompare(b))
      .join(","),
    filters.member ?? "",
    [...(filters.collectionNo ?? [])]
      .sort((a, b) => a.localeCompare(b))
      .join(","),
    String(filters.transferable ?? ""),
  ];
  const hash = createHash("md5").update(parts.join(":")).digest("hex");
  return `objekt-count:${hash}`;
}

/**
 * Check if any selective collection filters are present.
 * Artist/artists are excluded as they're typically broad and perform well with baseline.
 */
function hasCollectionFilters(data: InputData): boolean {
  return !!(
    data.member ||
    data.artist ||
    (data.class && data.class.length > 0) ||
    (data.season && data.season.length > 0) ||
    (data.collectionNo && data.collectionNo.length > 0) ||
    (data.on_offline && data.on_offline.length > 0)
  );
}

/**
 * Check if the sort is on an objekt table column (received_at, serial).
 * These sorts benefit from collection-first queries when selective filters are present.
 */
function isObjektSort(sort: InputData["sort"]): boolean {
  return ["newest", "oldest", "serialAsc", "serialDesc"].includes(
    sort ?? "newest",
  );
}

/**
 * Build collection filter conditions from input data.
 */
function collectionFilters(data: InputData) {
  return [
    ...withArtist(data.artist),
    ...withClass(data.class ?? []),
    ...withSeason(data.season ?? []),
    ...withOnlineType(data.on_offline ?? []),
    ...withMember(data.member),
    ...withCollections(data.collectionNo),
    ...withSelectedArtists(data.artists),
  ];
}
