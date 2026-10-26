import {
  $fetchListingFeed,
  $fetchListingFeedTotal,
} from "@/lib/functions/listing-feed";
import {
  type ListingFeedSearch,
  normalizeFeedArtists,
  normalizeListingFeedFilters,
} from "@/lib/universal/parsers";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

// every Listings feed query, for invalidating after a listing changes
export const marketListingsKey = ["market-listings"] as const;

export function listingFeedQuery(
  searchParams: ListingFeedSearch,
  selectedArtists: string[],
) {
  const { filters, type } = normalizeListingFeedFilters(searchParams);
  const artists = normalizeFeedArtists(selectedArtists);

  return infiniteQueryOptions({
    queryKey: [...marketListingsKey, "feed", { filters, type }, artists],
    queryFn: ({ signal, pageParam }) =>
      $fetchListingFeed({
        signal,
        data: { filters, type, artists, cursor: pageParam },
      }),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 30,
  });
}

/**
 * The header's count for the same filters, read apart from the pages so the
 * first page never waits on it.
 */
export function listingFeedTotalQuery(
  searchParams: ListingFeedSearch,
  selectedArtists: string[],
) {
  const { filters, type } = normalizeListingFeedFilters(searchParams);
  const artists = normalizeFeedArtists(selectedArtists);

  return queryOptions({
    queryKey: [...marketListingsKey, "total", { filters, type }, artists],
    queryFn: ({ signal }) =>
      $fetchListingFeedTotal({ signal, data: { filters, type, artists } }),
    staleTime: 1000 * 30,
  });
}

/**
 * The first page has no cursor. Typed as the cursor union so the query
 * infers its page param from it.
 */
const firstPage: string | undefined = undefined;
