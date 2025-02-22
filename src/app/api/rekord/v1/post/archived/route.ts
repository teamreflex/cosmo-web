import { fetchArchivedPosts } from "@/lib/server/cosmo/rekord";
import { withCosmoApi } from "@/lib/server/handlers/withCosmoApi";
import { parseRekordFilters } from "@/lib/universal/cosmo/rekord";

/**
 * API route that services the /rekord/archive page.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const params = parseRekordFilters(req.nextUrl.searchParams);

  const results = await fetchArchivedPosts(user.accessToken, params);
  const fromPostId = results.at(-1)?.post.id ?? undefined;
  const hasNextPage = results.length === params.limit;

  return Response.json({
    results,
    // for whatever reason, the archive endpoint doesn't use a cursor
    fromPostId: hasNextPage ? fromPostId : undefined,
  });
});
