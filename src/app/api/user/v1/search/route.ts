import { getUser } from "@/app/api/common";
import { search } from "@/lib/server/cosmo/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * API route that proxies the Cosmo search endpoint.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  const auth = await getUser();
  if (!auth.success) {
    return new Response("Unauthorized", { status: 401 });
  }

  return NextResponse.json(await search(auth.user.accessToken, query));
}
