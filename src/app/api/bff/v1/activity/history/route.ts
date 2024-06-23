import { getAuth } from "@/app/api/common";
import { fetchActivityHistory } from "@/lib/server/cosmo/activity";
import { parseBffActivityHistoryParams } from "@/lib/universal/cosmo/activity";
import { NextRequest } from "next/server";

/**
 * API route that services the activity history page.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth();
  if (auth.status === "invalid") {
    return new Response("unauthorized", { status: 401 });
  }

  const options = parseBffActivityHistoryParams(request.nextUrl.searchParams);
  const results = await fetchActivityHistory(auth.user.accessToken, options);

  return Response.json(results);
}
