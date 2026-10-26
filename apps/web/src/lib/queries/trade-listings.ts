import {
  $fetchOfferedTokenRefusals,
  $fetchRangeMatchCount,
  $fetchTradeListing,
  $fetchTradeListingViewer,
  $fetchTradeTokenStates,
} from "@/lib/functions/trade-listings";
import type { RangeFilter } from "@apollo/trades/range";
import { queryOptions } from "@tanstack/react-query";

// every listing detail, for invalidating after a listing changes
export const tradeListingKey = ["trade-listing"] as const;

/**
 * Every viewer-specific listing query. Their answers depend on who is
 * signed in, so removeViewerQueries clears the prefix on account changes.
 */
export const tradeListingViewerKey = ["trade-listing-viewer"] as const;

export const tradeListingQuery = (id: string) =>
  queryOptions({
    queryKey: [...tradeListingKey, id],
    queryFn: ({ signal }) =>
      $fetchTradeListing({ signal, data: { listingId: id } }),
    staleTime: 1000 * 30,
  });

/**
 * The viewer's side of the listing as of `updatedAt`, so new terms always
 * fetch a fresh allocation.
 */
export const tradeListingViewerQuery = (id: string, updatedAt: Date) =>
  queryOptions({
    queryKey: [...tradeListingViewerKey, id, updatedAt.toISOString()],
    queryFn: ({ signal }) =>
      $fetchTradeListingViewer({ signal, data: { listingId: id } }),
    staleTime: 0,
  });

/**
 * The viewer's locked tokens and the tokens in their live trades, which the
 * composer greys out; editing a listing names it, so the objekts live in its
 * own trades stay pickable. Keyed under the viewer prefix, so it goes with
 * the account that read it.
 */
export const tradeTokenStatesQuery = (editedListing?: string) =>
  queryOptions({
    queryKey: [...tradeListingViewerKey, "token-states", editedListing ?? null],
    queryFn: ({ signal }) =>
      $fetchTradeTokenStates({ signal, data: { listingId: editedListing } }),
    select: ({ locked, live }) => ({
      locked: new Set(locked),
      live: new Set(live),
    }),
    staleTime: 1000 * 30,
  });

/**
 * Why the viewer couldn't offer each of these objekts right now, by token
 * id; tokens they can offer are left out. Editing a listing names it, so its
 * own trades don't refuse its objekts. Keyed under the viewer prefix, since
 * the answer depends on whose objekts they are.
 */
export const offeredTokenRefusalsQuery = (
  tokenIds: readonly number[],
  editedListing?: string,
) =>
  queryOptions({
    queryKey: [
      ...tradeListingViewerKey,
      "offered-refusals",
      tokenIds.toSorted((a, b) => a - b),
      editedListing ?? null,
    ],
    queryFn: ({ signal }) =>
      $fetchOfferedTokenRefusals({
        signal,
        data: { tokenIds: [...tokenIds], listingId: editedListing },
      }),
    select: (refusals) =>
      new Map(refusals.map((refusal) => [refusal.tokenId, refusal.reason])),
    staleTime: 1000 * 30,
  });

/**
 * How many collections a composer range row covers.
 */
export const rangeMatchCountQuery = (filter: RangeFilter) =>
  queryOptions({
    queryKey: ["trade-range-matches", filter],
    queryFn: ({ signal }) => $fetchRangeMatchCount({ signal, data: filter }),
    staleTime: 1000 * 60 * 5,
  });
