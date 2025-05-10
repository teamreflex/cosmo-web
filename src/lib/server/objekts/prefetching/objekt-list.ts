import { and, sql } from "drizzle-orm";
import {
  withArtist,
  withClass,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
  withObjektIndexSort,
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
  userId: string;
  filters: z.infer<typeof objektList>;
};

/**
 * Fetch objekts from the indexer with given filters.
 */
export async function fetchObjektList({
  slug,
  userId,
  filters,
}: FetchObjektList) {
  // fetch objekt list from database
  const objektList = await db.query.objektLists.findFirst({
    where: {
      slug,
      userId,
    },
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
  const entries = objektList.entries.map((e) => ({
    slug: e.collectionId,
    id: e.id,
  }));

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
          ...withObjektListEntries(entries.map((e) => e.slug)),
          ...withArtist(filters.artist),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
        ]
      )
    )
    .$dynamic();
  query = withObjektIndexSort(query, filters.sort);
  query = query.limit(LIMIT).offset(filters.page * LIMIT);

  const result = await query;

  const flatCollections = result.map((c) => c.collections);
  const collectionList = entries
    .map((entry) => {
      const collection = flatCollections.find((c) => c.slug === entry.slug);
      if (!collection) return undefined;
      return {
        ...collection,
        // map the entryId into the collection for uniqueness
        id: entry.id.toString(),
      };
    })
    .filter(Boolean);
  const hasNext = collectionList.length === LIMIT;
  const nextStartAfter = hasNext ? filters.page + 1 : undefined;

  return {
    objektList,
    results: {
      total: Number(result[0]?.count ?? 0),
      hasNext,
      nextStartAfter,
      objekts: collectionList,
    },
  };
}
