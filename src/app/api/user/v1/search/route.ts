import { cacheAccounts } from "@/lib/server/cosmo-accounts";
import { search } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { cosmoAccounts } from "@/lib/server/db/schema";
import { getProxiedToken } from "@/lib/server/handlers/withProxiedToken";
import { CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { Addresses } from "@/lib/utils";
import { like } from "drizzle-orm";
import { NextRequest, after } from "next/server";

/**
 * API route for user search.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";

  // get the latest cosmo token
  const { accessToken } = await getProxiedToken();

  let results: CosmoSearchResult = { results: [] };

  // try cosmo first
  try {
    results = await search(accessToken, query);
  } catch {
    // fallback to database
    return Response.json(await queryDatabase(query));
  }

  // take the results and insert any new profiles after the response is sent
  if (results.results.length > 0) {
    after(async () => {
      const newAccounts = results.results.map((r) => ({
        username: r.nickname,
        address: r.address,
      }));

      try {
        await cacheAccounts(newAccounts);
      } catch (err) {
        console.error("Bulk profile caching failed:", err);
      }
    });
  }

  // insert @cosmo-spin when doing a cosmo search
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
      username: cosmoAccounts.username,
      address: cosmoAccounts.address,
    })
    .from(cosmoAccounts)
    .where(like(cosmoAccounts.username, `${query}%`));

  return {
    results: users.map((result) => ({
      nickname: result.username,
      address: result.address,
      profileImageUrl: "",
      profile: [],
    })),
  };
}
