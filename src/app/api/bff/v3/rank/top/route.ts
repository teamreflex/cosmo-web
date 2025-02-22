import { fetchActivityRankingTop } from "@/lib/server/cosmo/ranking";
import { withCosmoApi } from "@/lib/server/handlers/withCosmoApi";
import { parseBffActivityRankingTopParams } from "@/lib/universal/cosmo/activity/ranking";

/**
 * API route that services the activity top ranking.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const options = parseBffActivityRankingTopParams(req.nextUrl.searchParams);
  const results = await fetchActivityRankingTop(user.accessToken, options);

  return Response.json(results);
});
