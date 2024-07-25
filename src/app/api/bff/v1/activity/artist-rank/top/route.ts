import { getUser } from "@/app/api/common";
import { fetchActivityRankingTop } from "@/lib/server/cosmo/activity";
import { parseBffActivityRankingTopParams } from "@/lib/universal/cosmo/activity/ranking";
import { NextRequest } from "next/server";

/**
 * API route that services the activity top ranking.
 */
export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const options = parseBffActivityRankingTopParams(
    request.nextUrl.searchParams
  );
  const results = await fetchActivityRankingTop(auth.user.accessToken, options);

  return Response.json(results);
}
