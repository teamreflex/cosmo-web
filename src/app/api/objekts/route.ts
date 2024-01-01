import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
  withSort,
} from "@/lib/server/objekts/filters";
import { fetchObjektListWithEntries } from "@/lib/server/objekts/lists";
import { parseParams } from "@/lib/universal/objekts";
import { and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const PER_PAGE = 60;

/**
 * API route that services the /objekts page and /@:nickname/list/* objekt list pages.
 * Takes all Cosmo filters as query params.
 */
export async function GET(request: NextRequest) {
  const filters = parseParams(request.nextUrl.searchParams);

  const objektList = filters.list
    ? await fetchObjektListWithEntries(filters.address, filters.list)
    : undefined;
  const entries: string[] = [];

  if (filters.list) {
    if (!objektList || (objektList && objektList.entries.length === 0)) {
      return NextResponse.json({
        total: 0,
        hasNext: false,
        objekts: [],
      });
    }

    entries.push(...objektList.entries.map((e) => e.collectionId));
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
          ...withCollections(filters.collectionNo),
        ]
      )
    )
    .$dynamic();
  query = withSort(query, filters.sort);
  query = query.limit(PER_PAGE).offset(filters.page * PER_PAGE);

  const result = await query;

  const collectionList = result.map((c) => c.collections);
  const hasNext = collectionList.length === PER_PAGE;
  const nextStartAfter = hasNext ? filters.page + 1 : undefined;

  return NextResponse.json({
    total: result[0]?.count ?? 0,
    hasNext,
    nextStartAfter,
    objekts: collectionList,
  });
}
