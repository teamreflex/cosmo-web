import { getAuth } from "@/app/api/common";
import { fetchFeedBff } from "@/lib/server/cosmo/news";
import { parseBffNewsParams } from "@/lib/universal/cosmo/news";
import { NextRequest } from "next/server";

/**
 * API route that services the /news/feed page.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth();
  if (auth.status === "invalid") {
    return new Response("unauthorized", { status: 401 });
  }

  const { artistName, page } = parseBffNewsParams(request.nextUrl.searchParams);
  const results = await fetchFeedBff(auth.user.accessToken, artistName, page);

  return Response.json(results);
}
