import { getUser } from "@/app/api/common";
import {
  ObjektQueryParams,
  ownedByMe,
  validClasses,
  validOnlineTypes,
  validSeasons,
  validSorts,
} from "@/lib/server/cosmo";
import { validArtists } from "@/lib/server/cosmo/common";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

const objektFilterSchema = z.object({
  showLocked: z.coerce.boolean(),
  startAfter: z.number(),
  nextStartAfter: z.number().optional(),
  member: z.string().optional(),
  artist: z.enum(validArtists).optional(),
  sort: z.enum(validSorts),
  classType: z.enum(validClasses).array().optional(),
  onlineType: z.enum(validOnlineTypes).array().optional(),
  season: z.enum(validSeasons).array().optional(),
  transferable: z.boolean().optional(),
  gridable: z.boolean().optional(),
  usedForGrid: z.boolean().optional(),
  collection: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const objekts = await ownedByMe({
    token: auth.user.cosmoToken,
    ...parseParams(request.nextUrl.searchParams),
  });

  return NextResponse.json(objekts, { status: 200 });
}

function parseParams(params: URLSearchParams): ObjektQueryParams {
  const classType = params.get("classType");
  const onlineType = params.get("onlineType");
  const season = params.get("season");

  const result = objektFilterSchema.safeParse({
    startAfter: parseInt(params.get("startAfter") ?? "0"),
    nextStartAfter: parseInt(params.get("nextStartAfter") ?? "0"),
    member: params.get("member") || undefined,
    artist: params.get("artist") || undefined,
    sort: params.get("sort") || undefined,
    classType: classType ? classType.split(",") : undefined,
    onlineType: onlineType ? onlineType.split(",") : undefined,
    season: season ? season.split(",") : undefined,
    transferable: params.get("transferable") === "true",
    gridable: params.get("gridable") === "true",
    usedForGrid: params.has("usedForGrid")
      ? params.get("usedForGrid") === "true"
      : undefined,
    collection: params.get("collection") || undefined,
  });

  if (result.success) {
    return result.data;
  }

  return {
    startAfter: 0,
    nextStartAfter: 0,
    sort: "newest",
  };
}
