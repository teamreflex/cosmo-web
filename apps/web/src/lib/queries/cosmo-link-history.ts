import { $fetchCosmoLinkHistory } from "@/lib/functions/cosmo-link-history";
import { infiniteQueryOptions } from "@tanstack/react-query";

/**
 * The history grows with every link anywhere on the site, so it is refetched
 * whenever it's shown.
 */
export function cosmoLinkHistoryQuery(search: string | undefined) {
  return infiniteQueryOptions({
    queryKey: ["admin", "cosmo-link-history", { search }],
    queryFn: ({ signal, pageParam }) =>
      $fetchCosmoLinkHistory({ signal, data: { search, cursor: pageParam } }),
    // SAFETY: cursor seed; widened for TanStack Query inference
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 0,
  });
}
