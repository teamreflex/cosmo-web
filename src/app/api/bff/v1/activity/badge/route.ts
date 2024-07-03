import { getUser } from "@/app/api/common";
import { fetchActivityBadges } from "@/lib/server/cosmo/activity";
import { parseBffActivityBadgeParams } from "@/lib/universal/cosmo/activity";
import { NextRequest } from "next/server";

/**
 * API route that services the activity badges page.
 */
export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const options = parseBffActivityBadgeParams(request.nextUrl.searchParams);
  const results = await fetchActivityBadges(auth.user.accessToken, options);

  return Response.json(results);
}
