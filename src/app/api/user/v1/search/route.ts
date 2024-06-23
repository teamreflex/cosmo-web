import { getUser } from "@/app/api/common";
import { CosmoSearchResult, search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { validateExpiry } from "@/lib/server/jwt";
import { like } from "drizzle-orm";
import { NextRequest } from "next/server";

/**
 * API route for user search.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  const auth = await getUser();

  /**
   * use the database if:
   * - user is not authenticated
   * - or, user is authenticated but the token is expired
   */
  if (
    auth.success === false ||
    (auth.success === true && validateExpiry(auth.user.accessToken) === false)
  ) {
    return Response.json(await queryDatabase(query));
  }

  // otherwise, use cosmo
  return Response.json(await search(auth.user.accessToken, query));
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
