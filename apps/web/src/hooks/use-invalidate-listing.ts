import { marketListingsKey } from "@/lib/queries/listing-feed";
import {
  tradeListingKey,
  tradeListingQuery,
  tradeListingViewerKey,
} from "@/lib/queries/trade-listings";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Refetches everything a change to a listing can touch: its detail (every
 * detail without an id), every viewer-side answer and the Listings feed.
 */
export function useInvalidateListing(id?: string) {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          id === undefined ? tradeListingKey : tradeListingQuery(id).queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: tradeListingViewerKey }),
      queryClient.invalidateQueries({ queryKey: marketListingsKey }),
    ]);
}
