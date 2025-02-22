import { fetchFeedBff } from "@/lib/server/cosmo/news";
import { withCosmoApi } from "@/lib/server/handlers/withCosmoApi";
import { parseBffNewsParams } from "@/lib/universal/cosmo/news";

/**
 * API route that services the /news/feed page.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const { artistName, page } = parseBffNewsParams(req.nextUrl.searchParams);
  const results = await fetchFeedBff(user.accessToken, artistName, page);

  return Response.json(results);
});
