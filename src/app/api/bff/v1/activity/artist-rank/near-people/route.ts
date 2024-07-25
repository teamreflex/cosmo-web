import { getUser } from "@/app/api/common";
import { fetchActivityRankingNear } from "@/lib/server/cosmo/activity";
import { parseBffActivityRankingNearParams } from "@/lib/universal/cosmo/activity/ranking";
import { NextRequest } from "next/server";

/**
 * API route that services the activity near people ranking.
 */
export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const options = parseBffActivityRankingNearParams(
    request.nextUrl.searchParams
  );
  const results = await fetchActivityRankingNear(
    auth.user.accessToken,
    options
  );

  return Response.json(results);
}
