import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
  withTimeframe,
} from "@/lib/server/objekts/filters";
import {
  validArtists,
  validClasses,
  validOnlineTypes,
  validSeasons,
} from "@/lib/universal/cosmo/common";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * API route that services the /objekts/stats page.
 * Takes most of the usual objekt filters to aggregate a count of those objekts.
 */
export async function GET(request: NextRequest) {
  const filters = parseParams(request.nextUrl.searchParams);

  const where = [
    ...withArtist(filters.artist),
    ...withClass(filters.class),
    ...withSeason(filters.season),
    ...withOnlineType(filters.on_offline),
    ...withMember(filters.member),
    ...withTimeframe(filters.timeframe),
    ...withCollections(filters.collectionNo),
  ];

  if (where.length === 0) {
    return NextResponse.json({
      count: 0,
      time: "0ms",
    });
  }

  const start = new Date().getTime();
  const result = await indexer
    .select({
      count: sql<number>`count(*) AS count`,
    })
    .from(objekts)
    .where(and(...where))
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .limit(1);
  const end = new Date().getTime();

  return NextResponse.json({
    count: result[0]?.count ?? 0,
    time: `${end - start}ms`,
  });
}

const schema = z.object({
  season: z.array(z.enum(validSeasons)).default([]),
  class: z.array(z.enum(validClasses)).default([]),
  on_offline: z.array(z.enum(validOnlineTypes)).default([]),
  member: z.string().optional(),
  artist: z.enum(validArtists).optional(),
  collectionNo: z.array(z.string()).default([]),
  timeframe: z.tuple([z.string().datetime(), z.string().datetime()]).optional(),
});

function parseParams(params: URLSearchParams): z.infer<typeof schema> {
  const timeframeStart = params.get("timeframeStart");
  const timeframeEnd = params.get("timeframeEnd");

  const result = schema.safeParse({
    season: params.getAll("season"),
    class: params.getAll("class"),
    on_offline: params.getAll("on_offline"),
    member: params.get("member") ?? undefined,
    artist: params.get("artist") ?? undefined,
    collectionNo: params.getAll("collectionNo"),
    timeframe:
      timeframeStart && timeframeEnd
        ? [timeframeStart, timeframeEnd]
        : undefined,
  });

  return result.success
    ? result.data
    : {
        season: [],
        class: [],
        on_offline: [],
        member: undefined,
        artist: undefined,
        collectionNo: [],
        timeframe: undefined,
      };
}
