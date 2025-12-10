import { and } from "drizzle-orm";
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
import type { IndexedObjekt, ObjektResponse } from "@/lib/universal/objekts";
import { objektIndexBackendSchema } from "@/lib/universal/parsers";

const LIMIT = 60;

/**
 * Fetch objekts from the indexer with given filters.
 */
export const $fetchObjektsIndex = createServerFn({ method: "GET" })
  .inputValidator(objektIndexBackendSchema)
  .handler(async ({ data }) => {
    // build the where clause
    const where = and(
      ...[
        ...withArtist(data.artist),
        ...withClass(data.class ?? []),
        ...withSeason(data.season ?? []),
        ...withOnlineType(data.on_offline ?? []),
        ...withMember(data.member),
        ...withCollections(data.collectionNo),
        ...withSelectedArtists(data.artists),
      ],
    );

    // build the query
    let query = indexer.select().from(collections).where(where).$dynamic();
    query = withObjektIndexSort(query, data.sort ?? "newest");
    query = query.limit(LIMIT).offset(data.page * LIMIT);

    const [collectionList, total] = await Promise.all([
      query,
      indexer.$count(collections, where),
    ]);

    const hasNext = collectionList.length === LIMIT;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total: Number(total),
      hasNext,
      nextStartAfter,
      objekts: collectionList,
    } satisfies ObjektResponse<IndexedObjekt>;
  });
