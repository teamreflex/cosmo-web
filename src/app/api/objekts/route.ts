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
import {
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "@/lib/universal/cosmo/common";
import { and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const PER_PAGE = 60;

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

function parseParams(params: URLSearchParams) {
  return {
    list: params.has("list") ? params.get("list") : undefined,
    address: params.has("address") ? params.get("address") : undefined,
    page: parseInt(params.get("page") ?? "1"),
    sort: params.has("sort") ? (params.get("sort") as ValidSort) : "newest",
    season: params.getAll("season") as ValidSeason[],
    class: params.getAll("class") as ValidClass[],
    on_offline: params.getAll("on_offline") as ValidOnlineType[],
    member: params.has("member") ? params.get("member") : undefined,
    artist: params.has("artist")
      ? (params.get("artist") as ValidArtist)
      : undefined,
    collectionNo: params.getAll("collectionNo"),
  };
}
