import { marketListingsKey } from "@/lib/queries/listing-feed";
import { tradeListingKey } from "@/lib/queries/trade-listings";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Refetches everything a change to a listing can touch: every listing-page
 * query and the Listings feed.
 */
export function useInvalidateListing() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tradeListingKey }),
      queryClient.invalidateQueries({ queryKey: marketListingsKey }),
    ]);
}
