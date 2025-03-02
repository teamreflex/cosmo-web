import { getUser } from "@/app/api/common";
import { search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { validateExpiry } from "@/lib/server/jwt";
import { CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { Addresses } from "@/lib/utils";
import { like, sql } from "drizzle-orm";
import { NextRequest, after } from "next/server";

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
  try {
    var results = await search(auth.user.accessToken, query);
  } catch (err) {
    return Response.json(
      {
        error: "COSMO is currently experiencing issues.",
      },
      { status: 503 }
    );
  }

  // take the results and insert any new profiles after the response is sent
  if (results.results.length > 0) {
    after(async () => {
      const newProfiles = results.results.map((r) => ({
        nickname: r.nickname,
        userAddress: r.address,
        cosmoId: 0,
        artist: "artms" as const,
      }));

      try {
        await db
          .insert(profiles)
          .values(newProfiles)
          .onConflictDoUpdate({
            target: profiles.userAddress,
            set: {
              nickname: sql.raw(`excluded.${profiles.nickname.name}`),
            },
          });
      } catch (err) {
        console.error("Bulk profile caching failed:", err);
      }
    });
  }

  // insert @cosmo-spin
  if (query.toLowerCase().includes("cosmo-")) {
    results.results.push({
      nickname: "cosmo-spin",
      address: Addresses.SPIN,
      profileImageUrl: "",
      profile: [],
    });
  }

  // return results
  return Response.json(results);
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
