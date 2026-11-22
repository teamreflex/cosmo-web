import {
  $fetchMarketActivity,
  $fetchMarketSummary,
} from "@/lib/functions/staff-trades";
import type {
  MarketActivityCursor,
  MarketActivityFilters,
} from "@/lib/universal/market-activity";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

// the feed and the summary, which the page's Refresh button refetches together
export const marketActivityKey = ["admin", "market"] as const;

/**
 * Staff refresh the feed by hand, so a page loaded once stays as it was
 * until then, rather than refetching on focus once stale.
 */
export function marketActivityQuery(filters: MarketActivityFilters) {
  return infiniteQueryOptions({
    queryKey: [...marketActivityKey, "feed", filters],
    queryFn: ({ pageParam }) =>
      $fetchMarketActivity({ data: { ...filters, cursor: pageParam } }),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: "static",
  });
}

export const marketSummaryQuery = queryOptions({
  queryKey: [...marketActivityKey, "summary"],
  queryFn: () => $fetchMarketSummary(),
  staleTime: "static",
});

/**
 * The first page has no cursor. Typed as the cursor union so the query
 * infers its page param from it.
 */
const firstPage: MarketActivityCursor | undefined = undefined;
