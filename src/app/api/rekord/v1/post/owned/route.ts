import { fetchMyPosts } from "@/lib/server/cosmo/rekord";
import { withCosmoApi } from "@/lib/server/cosmo/withCosmoApi";
import { parseRekordFilters } from "@/lib/universal/cosmo/rekord";

/**
 * API route that services the /rekord/my page.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const params = parseRekordFilters(req.nextUrl.searchParams);

  const results = await fetchMyPosts(user.accessToken, params);
  const fromPostId = results.at(-1)?.post.id ?? undefined;

  return Response.json({
    results,
    fromPostId,
  });
});
