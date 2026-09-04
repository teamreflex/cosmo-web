import { $fetchMarket } from "@/lib/functions/objekts/market";
import {
  type marketFrontendSchema,
  normalizeMarketFilters,
} from "@/lib/universal/parsers";
import { infiniteQueryOptions } from "@tanstack/react-query";
import type { z } from "zod";

export function marketQuery(
  searchParams: z.infer<typeof marketFrontendSchema>,
  selectedArtists: string[],
) {
  return infiniteQueryOptions({
    queryKey: [
      "market",
      { ...normalizeMarketFilters(searchParams), artists: selectedArtists },
    ],
    queryFn: ({ signal, pageParam }) =>
      $fetchMarket({
        signal,
        data: { ...searchParams, page: pageParam, artists: selectedArtists },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    staleTime: 1000 * 60,
    refetchOnMount: false,
  });
}
