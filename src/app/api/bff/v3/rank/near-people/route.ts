import { fetchActivityRankingNear } from "@/lib/server/cosmo/ranking";
import { withCosmoApi } from "@/lib/server/cosmo/withCosmoApi";
import { parseBffActivityRankingNearParams } from "@/lib/universal/cosmo/activity/ranking";

/**
 * API route that services the activity near people ranking.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const options = parseBffActivityRankingNearParams(req.nextUrl.searchParams);
  const results = await fetchActivityRankingNear(user.accessToken, options);

  return Response.json(results);
});
