import {
  $fetchOfferedTokenRefusals,
  $fetchRangeMatchCounts,
  $fetchTradeListing,
  $fetchTradeTokenStates,
} from "@/lib/functions/trade-listings";
import type { RangeMatchCounts } from "@/lib/universal/trade-listings";
import type { RangeFilter } from "@apollo/trades/range";
import { queryOptions } from "@tanstack/react-query";

/**
 * Every listing-page query. Their answers depend on who is signed in, so
 * removeViewerQueries clears the prefix on account changes, and listing
 * actions invalidate it.
 */
export const tradeListingKey = ["trade-listing"] as const;

/**
 * The listing page: the public listing and the viewer's side of it in one
 * answer.
 */
export const tradeListingQuery = (id: string) =>
  queryOptions({
    queryKey: [...tradeListingKey, "detail", id],
    queryFn: ({ signal }) =>
      $fetchTradeListing({ signal, data: { listingId: id } }),
    staleTime: 1000 * 30,
  });

/**
 * The viewer's locked tokens and the tokens in their live trades, which the
 * composer greys out; editing a listing names it, so the objekts live in its
 * own trades stay pickable. Keyed under tradeListingKey, so it goes with
 * the account that read it.
 */
export const tradeTokenStatesQuery = (editedListing?: string) =>
  queryOptions({
    queryKey: [...tradeListingKey, "token-states", editedListing ?? null],
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
 * own trades don't refuse its objekts. Keyed under tradeListingKey, since
 * the answer depends on whose objekts they are.
 */
export const offeredTokenRefusalsQuery = (
  tokenIds: readonly number[],
  editedListing?: string,
) =>
  queryOptions({
    queryKey: [
      ...tradeListingKey,
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

// the counts for the row at `index`, of the counts fetched for every row in order
function matchCount(counts: readonly RangeMatchCounts[], index: number) {
  const count = counts[index];
  if (count === undefined) throw new Error(`no match count for range ${index}`);
  return count;
}

/**
 * How many collections a range row covers, in total and per range. It's
 * keyed by the row's whole set of ranges, so a row costs one indexer query
 * however many ranges it holds.
 */
export const rangeMatchCountQuery = (ranges: readonly RangeFilter[]) =>
  queryOptions({
    queryKey: ["trade-range-matches", ranges],
    queryFn: async ({ signal }) => {
      const counts = await $fetchRangeMatchCounts({
        signal,
        data: [[...ranges]],
      });
      return matchCount(counts, 0);
    },
    staleTime: 1000 * 60 * 5,
  });

/**
 * rangeMatchCountQuery for each of a listing's range rows, under the same
 * keys. Fetches started together share one request for every row; once it
 * settles, a retry or refetch makes a new one.
 */
export function rangeMatchCountQueries(
  rows: readonly (readonly RangeFilter[])[],
) {
  let request: Promise<RangeMatchCounts[]> | undefined;
  return rows.map((ranges, index) => ({
    ...rangeMatchCountQuery(ranges),
    queryFn: async () => {
      request ??= $fetchRangeMatchCounts({
        data: rows.map((row) => [...row]),
      }).finally(() => {
        request = undefined;
      });
      const counts = await request;
      return matchCount(counts, index);
    },
  }));
}
