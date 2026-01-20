import { cacheAccounts } from "@/lib/server/cosmo-accounts";
import { db } from "@/lib/server/db";
import { getProxiedToken } from "@/lib/server/proxied-token";
import { search } from "@apollo/cosmo/server/user";
import type { CosmoSearchResult } from "@apollo/cosmo/types/user";
import { cosmoAccounts } from "@apollo/database/web/schema";
import { createFileRoute } from "@tanstack/react-router";
import { like } from "drizzle-orm";

export const Route = createFileRoute("/api/bff/v3/users/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("query") ?? "";

        // get the latest cosmo token
        const { accessToken } = await getProxiedToken();

        let results: CosmoSearchResult = {
          hasNext: false,
          nextStartAfter: null,
          results: [],
        };

        // try cosmo first
        try {
          results = await search(accessToken, query);
        } catch {
          // fallback to database
          return Response.json(await queryDatabase(query));
        }

        // take the results and insert any new profiles
        if (results.results.length > 0) {
          await cacheResults(results, query);
        }

        // return results
        return Response.json(results);
      },
    },
  },
});

/**
 * Search the database for users with a nickname that starts with the query.
 */
async function queryDatabase(query: string): Promise<CosmoSearchResult> {
  if (query.length < 2) {
    return { hasNext: false, nextStartAfter: null, results: [] };
  }

  const users = await db
    .select({
      cosmoId: cosmoAccounts.cosmoId,
      username: cosmoAccounts.username,
      address: cosmoAccounts.address,
    })
    .from(cosmoAccounts)
    .where(like(cosmoAccounts.username, `${query}%`))
    .limit(100);

  return {
    hasNext: false,
    nextStartAfter: null,
    results: users.map((result) => ({
      id: result.cosmoId ?? 0,
      nickname: result.username,
      address: result.address,
      profileImageUrl: "",
      userProfiles: [],
    })),
  };
}

/**
 * Cache the results in the database.
 */
async function cacheResults(results: CosmoSearchResult, query: string) {
  const newAccounts = results.results.map((r) => ({
    username: r.nickname,
    address: r.address,
    polygonAddress: null,
  }));

  try {
    await cacheAccounts(newAccounts);
  } catch (err) {
    console.error("Bulk profile caching failed", {
      err,
      query,
      results: results.results,
    });
  }
}
