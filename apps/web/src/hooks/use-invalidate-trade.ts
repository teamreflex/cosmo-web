import { tradesKey } from "@/lib/queries/trades";
import { useQueryClient } from "@tanstack/react-query";
import { useInvalidateListing } from "./use-invalidate-listing";

/**
 * Refetches everything a party's action on a trade can touch: every trade
 * query, and the listing pages, when the trade came from a listing.
 */
export function useInvalidateTrade(listingId: string | null) {
  const queryClient = useQueryClient();
  const invalidateListing = useInvalidateListing();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tradesKey }),
      listingId !== null && invalidateListing(),
    ]);
}
