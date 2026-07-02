import { indexer } from "@/lib/server/db/indexer";
import { collections, members } from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withObjektIndexSort,
  withOnlineType,
  withSeason,
  withSelectedArtists,
} from "@/lib/server/objekts/filters.server";
import type { IndexedObjekt, ObjektResponse } from "@/lib/universal/objekts";
import { objektIndexBackendSchema } from "@/lib/universal/parsers";
import { isMemberSort } from "@apollo/cosmo/types/common";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, getColumns } from "drizzle-orm";

const LIMIT = 60;

/**
 * Fetch objekts from the indexer with given filters.
 */
export const $fetchObjektsIndex = createServerFn({ method: "GET" })
  .validator(objektIndexBackendSchema)
  .handler(async ({ data }) => {
    // build the where clause
    const where = and(
      ...withArtist(data.artist),
      ...withClass(data.class ?? []),
      ...withSeason(data.season ?? []),
      ...withOnlineType(data.on_offline ?? []),
      ...withMember(data.member),
      ...withCollections(data.collectionNo),
      ...withSelectedArtists(data.artists),
    );

    // build the query (explicit columns so the member join can't reshape rows)
    const sort = data.sort ?? "newest";
    let query = indexer
      .select(getColumns(collections))
      .from(collections)
      .where(where)
      .$dynamic();
    if (isMemberSort(sort)) {
      query = query.leftJoin(members, eq(members.name, collections.member));
    }
    query = withObjektIndexSort(query, sort);
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
