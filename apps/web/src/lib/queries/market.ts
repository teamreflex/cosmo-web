import { $fetchMarket } from "@/lib/functions/objekts/market";
import { $fetchMyListings } from "@/lib/functions/objekts/my-listings";
import { type MarketCursor, toFloorBounds } from "@/lib/universal/market";
import {
  type marketFrontendSchema,
  type myListingsFrontendSchema,
  normalizeMarketFilters,
} from "@/lib/universal/parsers";
import { infiniteQueryOptions } from "@tanstack/react-query";
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
    // SAFETY: cursor seed; widened for TanStack Query inference
    initialPageParam: undefined as MarketCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60,
    refetchOnMount: false,
  });
}

/**
 * Partial key filter for every my listings query, whatever its filters.
 */
export const myListingsQueryFilter = { queryKey: ["my-listings"] };

export function myListingsQuery(
  searchParams: z.infer<typeof myListingsFrontendSchema>,
) {
  const filters = {
    sort: searchParams.sort,
    status: searchParams.status,
    list: searchParams.list,
    artist: searchParams.artist,
    member: searchParams.member,
    season: searchParams.season,
    class: searchParams.class,
    on_offline: searchParams.on_offline,
    collectionNo: searchParams.collectionNo,
  };

  return infiniteQueryOptions({
    queryKey: ["my-listings", filters],
    queryFn: ({ signal, pageParam }) =>
      $fetchMyListings({ signal, data: { ...filters, page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    staleTime: 1000 * 60,
  });
}
