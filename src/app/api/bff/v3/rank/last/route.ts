import { fetchActivityRankingLast } from "@/lib/server/cosmo/ranking";
import { withCosmoApi } from "@/lib/server/cosmo/withCosmoApi";
import { parseBffActivityRankingLastParams } from "@/lib/universal/cosmo/activity/ranking";

/**
 * API route that services the activity last ranking.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const options = parseBffActivityRankingLastParams(req.nextUrl.searchParams);
  const results = await fetchActivityRankingLast(user.accessToken, options);

  return Response.json(results);
});
