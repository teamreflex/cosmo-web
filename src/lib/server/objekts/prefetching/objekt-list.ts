import { and, sql } from "drizzle-orm";
import {
  withArtist,
  withClass,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
  withSort,
} from "../filters";
import { z } from "zod";
import { objektList } from "@/lib/universal/parsers";
import { indexer } from "../../db/indexer";
import { collections } from "../../db/indexer/schema";
import { db } from "../../db";

const LIMIT = 60;

/**
 * Ensures the Zod-parsed filters match what the frontend parses.
 * Used for hydrating the query client.
 */
export function parseObjektListFilters(filters: z.infer<typeof objektList>) {
  return {
    artist: filters.artist,
    class: filters.class.length > 0 ? filters.class : null,
    member: filters.member,
    on_offline: filters.on_offline.length > 0 ? filters.on_offline : null,
    season: filters.season.length > 0 ? filters.season : null,
    sort: filters.sort === "newest" ? null : filters.sort,
    collection: null,
    collectionNo: null,
    gridable: null,
    transferable: null,
    used_for_grid: null,
  };
}

type FetchObjektList = {
  slug: string;
  address: string;
  filters: z.infer<typeof objektList>;
};

/**
 * Fetch objekts from the indexer with given filters.
 */
export async function fetchObjektList({
  slug,
  address,
  filters,
}: FetchObjektList) {
  // fetch objekt list from database
  const objektList = await db.query.lists.findFirst({
    where: (lists, { and, eq }) =>
      and(eq(lists.slug, slug), eq(lists.userAddress, address)),
    with: {
      entries: true,
    },
  });

  // handle 404
  if (!objektList) {
    return {
      objektList,
      results: {
        total: 0,
        hasNext: false,
        objekts: [],
      },
    };
  }

  // fetch applicable collections
  const entries = objektList.entries.map((e) => e.collectionId);

  // handle empty list
  if (entries.length === 0) {
    return {
      objektList,
      results: {
        total: 0,
        hasNext: false,
        objekts: [],
      },
    };
  }

  let query = indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
      collections,
    })
    .from(collections)
    .where(
      and(
        ...[
          ...withObjektListEntries(entries),
          ...withArtist(filters.artist),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
        ]
      )
    )
    .$dynamic();
  query = withSort(query, filters.sort);
  query = query.limit(LIMIT).offset(filters.page * LIMIT);

  const result = await query;

  const collectionList = result.map((c) => c.collections);
  const hasNext = collectionList.length === LIMIT;
  const nextStartAfter = hasNext ? filters.page + 1 : undefined;

  return {
    objektList,
    results: {
      total: result[0]?.count ?? 0,
      hasNext,
      nextStartAfter,
      objekts: collectionList,
    },
  };
}
