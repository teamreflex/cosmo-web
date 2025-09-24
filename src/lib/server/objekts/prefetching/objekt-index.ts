import { and, sql } from "drizzle-orm";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withObjektIndexSort,
  withOnlineType,
  withSeason,
  withSelectedArtists,
} from "../filters";
import { indexer } from "../../db/indexer";
import { collections } from "../../db/indexer/schema";
import type { z } from "zod";
import type { objektIndexSearchSchema } from "@/lib/universal/parsers";

const LIMIT = 60;

/**
 * Fetch objekts from the indexer with given filters.
 */
export async function fetchObjektsIndex(
  filters: z.infer<typeof objektIndexSearchSchema>
) {
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
          ...withSelectedArtists(filters.artists),
        ]
      )
    )
    .$dynamic();
  query = withObjektIndexSort(query, filters.sort);
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
