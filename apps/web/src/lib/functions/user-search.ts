import {
  cacheAccounts,
  searchCosmoAccounts,
} from "@/lib/server/cosmo-accounts.server";
import { getProxiedToken } from "@/lib/server/proxied-token.server";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { getClientIp, getRequestSignal } from "@/lib/server/request.server";
import { userSearchSchema } from "@/lib/universal/schema/cosmo";
import { runCosmo } from "@apollo/cosmo/runtime";
import { search } from "@apollo/cosmo/server/user";
import type { CosmoSearchResult } from "@apollo/cosmo/types/user";
import { createServerFn } from "@tanstack/react-start";

/**
 * Search for COSMO users, falling back to the database when the COSMO API
 * is unavailable. IP-keyed rate limit: the search is unauthenticated and
 * proxies the dummy account's token.
 */
export const $searchUsers = createServerFn({ method: "GET" })
  .validator(userSearchSchema)
  .handler(async ({ data }): Promise<CosmoSearchResult> => {
    await consumeRateLimit({
      key: `user-search:${getClientIp()}`,
      limit: 15,
      window: "1 minute",
    });

    const signal = getRequestSignal();

    // get the latest cosmo token
    const { accessToken } = await getProxiedToken(signal);

    // try cosmo first
    let results: CosmoSearchResult;
    try {
      results = await runCosmo(search(accessToken, data.query), signal);
    } catch {
      return await searchCosmoAccounts(data.query);
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
          query: data.query,
          results: results.results,
        });
      }
    }

    return results;
  });
