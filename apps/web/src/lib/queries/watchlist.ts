import {
  $fetchWatchedSlugs,
  $fetchWatchlist,
} from "@/lib/functions/watchlist";
import type { watchlistFrontendSchema } from "@/lib/universal/parsers";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { z } from "zod";

/**
 * Slugs the signed-in viewer watches; every watch toggle reads it.
 */
export const watchedSlugsQuery = queryOptions({
  queryKey: ["watchlist", "slugs"],
  queryFn: ({ signal }) => $fetchWatchedSlugs({ signal }),
  staleTime: 1000 * 60 * 5,
});

/**
 * Partial key filter for every watchlist page query, whatever its filters.
 */
export const watchlistQueryFilter = { queryKey: ["watchlist", "page"] };

export function watchlistQuery(
  searchParams: z.infer<typeof watchlistFrontendSchema>,
) {
  const filters = {
    sort: searchParams.sort,
    artist: searchParams.artist,
    member: searchParams.member,
    season: searchParams.season,
    class: searchParams.class,
    on_offline: searchParams.on_offline,
    collectionNo: searchParams.collectionNo,
  };

  return infiniteQueryOptions({
    queryKey: ["watchlist", "page", filters],
    queryFn: ({ signal, pageParam }) =>
      $fetchWatchlist({ signal, data: { ...filters, page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    staleTime: 1000 * 60,
  });
}
