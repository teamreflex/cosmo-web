import { getUser } from "@/app/api/common";
import { ObjektQueryParams, ownedByMe } from "@/lib/server/cosmo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const objekts = await ownedByMe({
    token: auth.user.cosmoToken,
    ...parseParams(request.nextUrl.searchParams),
  });

  console.log({
    hasNext: objekts.hasNext,
    nextStartAfter: objekts.nextStartAfter,
    total: objekts.total,
  });

  return NextResponse.json(objekts, { status: 200 });
}

function parseParams(params: URLSearchParams): ObjektQueryParams {
  const artist = params.get("artist");
  const parsedArtist =
    artist !== null ? (isValidArtist(artist) ? artist : undefined) : undefined;

  const sort = params.get("sort");
  const parsedSort =
    sort !== null ? (isValidSort(sort) ? sort : "newest") : "newest";

  return {
    startAfter: parseInt(params.get("startAfter") ?? "0"),
    nextStartAfter: parseInt(params.get("nextStartAfter") ?? "0"),
    member: params.get("member") ?? undefined,
    artist: parsedArtist,
    sort: parsedSort,
    showLocked: params.get("showLocked") === "true",
  };
}

function isValidArtist(
  artist: string
): artist is NonNullable<ObjektQueryParams["artist"]> {
  return artist === "tripleS" || artist === "artms";
}

function isValidSort(sort: string): sort is ObjektQueryParams["sort"] {
  return (
    sort === "newest" ||
    sort === "oldest" ||
    sort === "noAscending" ||
    sort === "noDescending"
  );
}
