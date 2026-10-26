import { tradesKey } from "@/lib/queries/trades";
import { useQueryClient } from "@tanstack/react-query";
import { useInvalidateListing } from "./use-invalidate-listing";

/**
 * Refetches everything a party's action on a trade can touch: every trade
 * query, and the listing the trade was claimed from, if any.
 */
export function useInvalidateTrade(listingId: string | null) {
  const queryClient = useQueryClient();
  const invalidateListing = useInvalidateListing(listingId ?? undefined);

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tradesKey }),
      listingId !== null && invalidateListing(),
    ]);
}
