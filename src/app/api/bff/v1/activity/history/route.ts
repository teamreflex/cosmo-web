import { fetchActivityHistory } from "@/lib/server/cosmo/activity";
import { withCosmoApi } from "@/lib/server/handlers/withCosmoApi";
import { parseBffActivityHistoryParams } from "@/lib/universal/cosmo/activity/history";

/**
 * API route that services the activity history page.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const options = parseBffActivityHistoryParams(req.nextUrl.searchParams);
  const results = await fetchActivityHistory(user.accessToken, options);

  return Response.json(results);
});
