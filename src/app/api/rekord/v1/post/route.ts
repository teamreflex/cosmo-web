import { getAuth } from "@/app/api/common";
import { fetchPosts } from "@/lib/server/cosmo/rekord";
import { parseRekordFilters } from "@/lib/universal/cosmo/rekord";
import { NextRequest } from "next/server";

/**
 * API route that services the /rekord page.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth();
  if (auth.status === "invalid") {
    return new Response("unauthorized", { status: 401 });
  }

  const params = parseRekordFilters(request.nextUrl.searchParams);

  const results = await fetchPosts(auth.user.accessToken, params);
  const fromPostId = results.at(-1)?.post.id ?? undefined;

  return Response.json({
    results,
    fromPostId,
  });
}
