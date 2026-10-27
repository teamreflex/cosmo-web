import {
  $fetchMarketNoticeAccepted,
  $fetchRangeOffersNoticeDismissed,
} from "@/lib/functions/market-notice";
import { $fetchMarket } from "@/lib/functions/objekts/market";
import { type MarketCursor, toFloorBounds } from "@/lib/universal/market";
import {
  type marketFrontendSchema,
  normalizeMarketFilters,
} from "@/lib/universal/parsers";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { z } from "zod";

export function marketQuery(
  searchParams: z.infer<typeof marketFrontendSchema>,
  selectedArtists: string[],
  display: { currency: string; rateToUsd: number },
) {
  const filters = {
    ...normalizeMarketFilters(searchParams),
    ...toFloorBounds(searchParams.price_min, searchParams.price_max, display),
    artists: selectedArtists,
  };

  return infiniteQueryOptions({
    queryKey: ["market", filters],
    queryFn: ({ signal, pageParam }) =>
      $fetchMarket({ signal, data: { ...filters, cursor: pageParam } }),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60,
    refetchOnMount: false,
  });
}

/**
 * The first page has no cursor. Typed as the cursor union so the query
 * infers its page param from it.
 */
const firstPage: MarketCursor | undefined = undefined;

/**
 * Whether this browser has accepted the market notice. Read once from its
 * cookie, then set directly when the notice is accepted.
 */
export const marketNoticeQuery = queryOptions({
  queryKey: ["market-notice"],
  queryFn: ({ signal }) => $fetchMarketNoticeAccepted({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});

/**
 * Whether this browser chose not to see the listing composer's range
 * confirmation again. Read once from its cookie, then set directly when it
 * is dismissed.
 */
export const rangeOffersNoticeQuery = queryOptions({
  queryKey: ["range-offers-notice"],
  queryFn: ({ signal }) => $fetchRangeOffersNoticeDismissed({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
