import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { like } from "drizzle-orm";
import { NextRequest } from "next/server";

/**
 * API route for user search.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  return Response.json(await queryDatabase(query));
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
      profile: [],
    })),
  };
}
