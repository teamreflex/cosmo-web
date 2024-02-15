import { getUser } from "@/app/api/common";
import {
  fetchArchivedPosts,
  fetchMyPosts,
  fetchPosts,
} from "@/lib/server/cosmo/rekord";
import { parseRekordFilters } from "@/lib/universal/cosmo/rekord";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route that services the /rekord/archive page.
 */
export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const params = parseRekordFilters(request.nextUrl.searchParams);

  const results = await fetchArchivedPosts(auth.user.accessToken, params);
  const fromPostId = results.at(-1)?.post.id ?? undefined;
  const hasNextPage = results.length === params.limit;

  return NextResponse.json({
    results,
    // for whatever reason, the archive endpoint doesn't use a cursor
    fromPostId: hasNextPage ? fromPostId : undefined,
  });
}
