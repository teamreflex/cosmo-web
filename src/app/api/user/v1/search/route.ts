import { getUser } from "@/app/api/common";
import { CosmoSearchResult, search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { like } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route for user search.
 * When authenticated, it proxies the Cosmo search endpoint.
 * When unauthenticated, it searches the database for cached users.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  const auth = await getUser();

  if (!auth.success) {
    return NextResponse.json(await queryDatabase(query));
  }

  return NextResponse.json(await search(auth.user.accessToken, query));
}

/**
 * Search the database for users with a nickname that starts with the query.
 */
async function queryDatabase(query: string): Promise<CosmoSearchResult> {
  if (query.length < 4) {
    return { results: [] };
  }

  const users = await db
    .select({
      nickname: profiles.nickname,
      address: profiles.userAddress,
    })
    .from(profiles)
    .where(like(profiles.nickname, `${query}%`));

  return {
    results: users.map((result) => ({
      ...result,
      profileImageUrl: "",
    })),
  };
}
