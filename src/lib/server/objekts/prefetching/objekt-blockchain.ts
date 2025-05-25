import type { userCollection } from "@/lib/universal/parsers";
import type { z } from "zod/v4";
import { indexer } from "../../db/indexer";
import { and, eq, sql } from "drizzle-orm";
import { collections, objekts } from "../../db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withCollectionSort,
  withOnlineType,
  withSeason,
  withTransferable,
  withSelectedArtists,
} from "../filters";
import { mapLegacyObjekt } from "./common";

const PER_PAGE = 60;

/**
 * Ensures the Zod-parsed filters match what the frontend parses.
 * Used for hydrating the query client.
 */
export function parseUserCollectionFilters(
  filters: z.infer<typeof userCollection>
) {
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
 * Fetch a user's objekts from the indexer with given filters.
 */
export async function fetchObjektsBlockchain(
  address: string,
  filters: z.infer<typeof userCollection>
) {
  let query = indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
      objekts,
      collections,
    })
    .from(objekts)
    .leftJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, address.toLowerCase()),
        ...[
          ...withArtist(filters.artist),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
          ...withCollections(filters.collectionNo),
          ...withTransferable(filters.transferable),
          ...withSelectedArtists(filters.artists),
        ]
      )
    )
    .$dynamic();
  query = withCollectionSort(query, filters.sort);
  query = query.limit(PER_PAGE).offset(filters.page * PER_PAGE);

  const results = await query;

  const hasNext = results.length === PER_PAGE;
  const nextStartAfter = hasNext ? filters.page + 1 : undefined;

  return {
    total: Number(results[0]?.count ?? 0),
    hasNext,
    nextStartAfter,
    objekts: results
      .filter((r) => r.collections !== null) // should never happen but just in case
      .map((row) => mapLegacyObjekt(row.objekts, row.collections!)),
  };
}
