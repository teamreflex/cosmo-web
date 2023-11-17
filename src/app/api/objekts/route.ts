import { indexer } from "@/lib/server/db/indexer";
import { objekts } from "@/lib/server/db/indexer/schema";
import {
  fetchObjektListWithEntries,
  withArtist,
  withClass,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
  withSort,
} from "@/lib/server/objekts";
import {
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "@/lib/universal/cosmo";
import { and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = "sfo1";
const PER_PAGE = 60;

export async function GET(request: NextRequest) {
  const filters = parseParams(request.nextUrl.searchParams);

  const objektList = filters.list
    ? await fetchObjektListWithEntries(filters.list)
    : undefined;
  const entries: number[] = [];

  if (filters.list) {
    if (!objektList || (objektList && objektList.entries.length === 0)) {
      return NextResponse.json({
        total: 0,
        hasNext: false,
        objekts: [],
      });
    }

    entries.push(...objektList.entries.map((e) => e.objektId));
  }

  let query = indexer
    .select()
    .from(objekts)
    .where(
      and(
        ...[
          ...(await withObjektListEntries(entries)),
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
  query = query.limit(PER_PAGE).offset(filters.page * PER_PAGE);

  const result = await query;

  const hasNext = result.length === PER_PAGE;
  const nextPage = hasNext ? filters.page + 1 : undefined;

  return NextResponse.json({
    total: 0,
    hasNext,
    nextPage,
    objekts: result,
  });
}

function parseParams(params: URLSearchParams) {
  return {
    list: params.has("list") ? params.get("list") : undefined,
    page: parseInt(params.get("page") ?? "1"),
    sort: params.has("sort") ? (params.get("sort") as ValidSort) : "newest",
    season: params.getAll("season") as ValidSeason[],
    class: params.getAll("class") as ValidClass[],
    on_offline: params.getAll("on_offline") as ValidOnlineType[],
    member: params.has("member") ? params.get("member") : undefined,
    artist: params.has("artist")
      ? (params.get("artist") as ValidArtist)
      : undefined,
  };
}
