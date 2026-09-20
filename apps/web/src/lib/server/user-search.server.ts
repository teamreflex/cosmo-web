import {
  cacheAccounts,
  searchCosmoAccounts,
} from "@/lib/server/cosmo-accounts.server";
import { getProxiedToken } from "@/lib/server/proxied-token.server";
import { runCosmo } from "@apollo/cosmo/runtime";
import { search } from "@apollo/cosmo/server/user";
import type { CosmoSearchResult } from "@apollo/cosmo/types/user";

/**
 * Search for COSMO users via the dummy account's token, falling back to the
 * database when the COSMO API is unavailable.
 * Any new profiles COSMO returns are cached for future lookups.
 */
export async function searchUsers(
  query: string,
  signal: AbortSignal | undefined,
): Promise<CosmoSearchResult> {
  // get the latest cosmo token
  const { accessToken } = await getProxiedToken(signal);

  // try cosmo first
  let results: CosmoSearchResult;
  try {
    results = await runCosmo(search(accessToken, query), signal);
  } catch {
    return await searchCosmoAccounts(query);
  }

  // take the results and insert any new profiles
  if (results.results.length > 0) {
    try {
      await cacheAccounts(
        results.results.map((r) => ({
          username: r.nickname,
          address: r.address,
          polygonAddress: null,
        })),
      );
    } catch (err) {
      console.error("Bulk profile caching failed", {
        err,
        query,
        results: results.results,
      });
    }
  }

  return results;
}
