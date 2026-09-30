import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { getClientIp, getRequestSignal } from "@/lib/server/request.server";
import { searchUsers } from "@/lib/server/user-search.server";
import { userSearchSchema } from "@/lib/universal/schema/cosmo";
import type { CosmoSearchResult } from "@apollo/cosmo/types/user";
import { createServerFn } from "@tanstack/react-start";

/**
 * Search for COSMO users. IP-keyed rate limit: the search is unauthenticated
 * and proxies the dummy account's token.
 */
export const $searchUsers = createServerFn({ method: "GET" })
  .validator(userSearchSchema)
  .handler(async ({ data }): Promise<CosmoSearchResult> => {
    await consumeRateLimit({
      key: `user-search:${getClientIp()}`,
      limit: 15,
      window: "1 minute",
    });

    return await searchUsers(data.query, getRequestSignal());
  });
