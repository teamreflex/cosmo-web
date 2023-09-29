import { getUser } from "@/app/api/common";
import { ValidArtist, fetchExclusive, validArtists } from "@/lib/server/cosmo";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const params = parseParams(request.nextUrl.searchParams);
  const result = await fetchExclusive(
    auth.user.cosmoToken,
    params.artist as ValidArtist,
    params.startAfter
  );

  return NextResponse.json(
    {
      startAfter: params.startAfter,
      ...result,
    },
    { status: 200 }
  );
}

const filterSchema = z.object({
  startAfter: z.number(),
  artist: z.enum(validArtists),
});

type QueryParams = {
  startAfter: number;
  artist: string;
};

function parseParams(params: URLSearchParams): QueryParams {
  const result = filterSchema.safeParse({
    startAfter: parseInt(params.get("startAfter") ?? "0"),
    artist: params.get("artist") || "artms",
  });

  if (result.success) {
    return result.data;
  }

  return {
    startAfter: 0,
    artist: "artms",
  };
}
