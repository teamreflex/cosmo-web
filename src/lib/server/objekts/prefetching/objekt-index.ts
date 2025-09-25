import { and, sql } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
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
import { objektIndexBackendSchema } from "@/lib/universal/parsers";

const LIMIT = 60;

/**
 * Fetch objekts from the indexer with given filters.
 */
export const fetchObjektsIndex = createServerFn({ method: "GET" })
  .inputValidator(objektIndexBackendSchema)
  .handler(async ({ data }) => {
    let query = indexer
      .select({
        count: sql<number>`count(*) OVER() AS count`,
        collections,
      })
      .from(collections)
      .where(
        and(
          ...[
            ...withArtist(data.artist),
            ...withClass(data.class ?? []),
            ...withSeason(data.season ?? []),
            ...withOnlineType(data.on_offline ?? []),
            ...withMember(data.member),
            ...withCollections(data.collectionNo),
            ...withSelectedArtists(data.artists),
          ]
        )
      )
      .$dynamic();
    query = withObjektIndexSort(query, data.sort ?? "newest");
    query = query.limit(LIMIT).offset(data.page * LIMIT);

    const result = await query;

    const collectionList = result.map((c) => c.collections);
    const hasNext = collectionList.length === LIMIT;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total: Number(result[0]?.count ?? 0),
      hasNext,
      nextStartAfter,
      objekts: collectionList,
    };
  });
