import { queryOptions } from "@tanstack/react-query";
import { $searchUsers } from "../functions/user-search";

/**
 * Search COSMO users by nickname. The request takes no abort signal, so a
 * search the user has typed past still finishes and stays cached.
 */
export const cosmoUserSearchQuery = (query: string) =>
  queryOptions({
    queryKey: ["cosmo-user-search", query],
    queryFn: async () => {
      const res = await $searchUsers({ data: { query } });
      return res.results;
    },
    retry: false,
  });
