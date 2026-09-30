import { $fetchMarket } from "@/lib/functions/objekts/market";
import { toFloorBounds } from "@/lib/universal/market";
import {
  type marketFrontendSchema,
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
      $fetchMarket({ signal, data: { ...filters, page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    staleTime: 1000 * 60,
    refetchOnMount: false,
  });
}
