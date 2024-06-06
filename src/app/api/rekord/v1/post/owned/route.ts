import { getUser } from "@/app/api/common";
import { fetchMyPosts } from "@/lib/server/cosmo/rekord";
import { parseRekordFilters } from "@/lib/universal/cosmo/rekord";
import { NextRequest } from "next/server";

/**
 * API route that services the /rekord/my page.
 */
export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const params = parseRekordFilters(request.nextUrl.searchParams);

  const results = await fetchMyPosts(auth.user.accessToken, params);
  const fromPostId = results.at(-1)?.post.id ?? undefined;

  return Response.json({
    results,
    fromPostId,
  });
}
