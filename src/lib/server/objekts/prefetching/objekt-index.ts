import { and, sql } from "drizzle-orm";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
  withCollectionSort,
} from "../filters";
import { z } from "zod";
import { objektIndex } from "@/lib/universal/parsers";
import { indexer } from "../../db/indexer";
import { collections } from "../../db/indexer/schema";

const LIMIT = 60;

/**
 * Ensures the Zod-parsed filters match what the frontend parses.
 * Used for hydrating the query client.
 */
export function parseObjektIndexFilters(filters: z.infer<typeof objektIndex>) {
  return {
    artist: filters.artist,
    class: filters.class.length > 0 ? filters.class : null,
    collection: null,
    collectionNo: filters.collectionNo.length > 0 ? filters.collectionNo : null,
    gridable: null,
    member: filters.member,
    on_offline: filters.on_offline.length > 0 ? filters.on_offline : null,
    season: filters.season.length > 0 ? filters.season : null,
    sort: filters.sort === "newest" ? null : filters.sort,
    transferable: null,
    used_for_grid: null,
  };
}

/**
 * Fetch objekts from the indexer with given filters.
 */
export async function fetchObjektsIndex(filters: z.infer<typeof objektIndex>) {
  let query = indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
      collections,
    })
    .from(collections)
    .where(
      and(
        ...[
          ...withArtist(filters.artist),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
          ...withCollections(filters.collectionNo),
        ]
      )
    )
    .$dynamic();
  query = withCollectionSort(query, filters.sort);
  query = query.limit(LIMIT).offset(filters.page * LIMIT);

  const result = await query;

  const collectionList = result.map((c) => c.collections);
  const hasNext = collectionList.length === LIMIT;
  const nextStartAfter = hasNext ? filters.page + 1 : undefined;

  return {
    total: Number(result[0]?.count ?? 0),
    hasNext,
    nextStartAfter,
    objekts: collectionList,
  };
}
