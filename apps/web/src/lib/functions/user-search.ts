import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts.server";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { getClientIp, getRequestSignal } from "@/lib/server/request.server";
import { searchUsers } from "@/lib/server/user-search.server";
import { userSearchSchema } from "@/lib/universal/schema/cosmo";
import { addr } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

/**
 * Search for COSMO users, each with the Apollo profile picture of whoever
 * linked the account. IP-keyed rate limit: the search is unauthenticated and
 * proxies the dummy account's token.
 */
export const $searchUsers = createServerFn({ method: "GET" })
  .validator(userSearchSchema)
  .handler(async ({ data }) => {
    await consumeRateLimit({
      key: `user-search:${getClientIp()}`,
      limit: 15,
      window: "1 minute",
    });

    const found = await searchUsers(data.query, getRequestSignal());
    const known = await fetchKnownAddresses(
      found.results.map((user) => user.address),
    );

    return {
      ...found,
      results: found.results.map((user) => ({
        ...user,
        avatar: known.get(addr(user.address))?.avatar ?? null,
      })),
    };
  });
