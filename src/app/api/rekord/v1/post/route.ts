import { getUser } from "@/app/api/common";
import { fetchPosts } from "@/lib/server/cosmo/rekord";
import { parseRekordFilters } from "@/lib/universal/cosmo/rekord";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route that services the rekord pages.
 */
export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const params = parseRekordFilters(request.nextUrl.searchParams);

  const results = await fetchPosts(auth.user.accessToken, params);
  const fromPostId = results.at(-1)?.id ?? undefined;

  return NextResponse.json({
    results,
    fromPostId,
  });
}
