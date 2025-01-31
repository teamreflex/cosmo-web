import { fetchActivityBadges } from "@/lib/server/cosmo/badges";
import { withCosmoApi } from "@/lib/server/cosmo/withCosmoApi";
import { parseBffActivityBadgeParams } from "@/lib/universal/cosmo/activity/badges";

/**
 * API route that services the activity badges page.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const options = parseBffActivityBadgeParams(req.nextUrl.searchParams);
  const results = await fetchActivityBadges(user.accessToken, options);

  return Response.json(results);
});
