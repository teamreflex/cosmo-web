import {
  $fetchCounterMatches,
  $fetchOfferSerials,
} from "@/lib/functions/lists";
import { $fetchMyTrades, $fetchTrade } from "@/lib/functions/trades";
import type { MyTradesCursor, MyTradesTab } from "@/lib/universal/trades";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/**
 * Every trade query. Their answers depend on who is signed in, so
 * removeViewerQueries clears the prefix on account changes, and trade
 * actions invalidate it.
 */
export const tradesKey = ["trades"] as const;

/**
 * One trade's page. Chat pushes an accepted trade's changes, but a pending
 * offer has no chat yet, so while one is open its page polls for an answer
 * or its expiry.
 */
export const tradeQuery = (id: string) =>
  queryOptions({
    queryKey: [...tradesKey, "detail", id],
    queryFn: ({ signal }) => $fetchTrade({ signal, data: { tradeId: id } }),
    refetchInterval: (query) =>
      query.state.data?.trade.state.status === "pending" ? 60_000 : false,
  });

/**
 * The copies a direct offer to a Trade Matches partner would trade, for
 * the collections each side would give.
 */
export const offerSerialsQuery = (listId: string, partnerId: string) =>
  queryOptions({
    queryKey: [...tradesKey, "offer-serials", listId, partnerId],
    queryFn: ({ signal }) =>
      $fetchOfferSerials({ signal, data: { listId, partnerId } }),
    staleTime: 1000 * 60,
  });

/**
 * What the recipient of a pending offer could put in a counter to it, with
 * the copy behind each collection.
 */
export const counterMatchesQuery = (tradeId: string) =>
  queryOptions({
    queryKey: [...tradesKey, "counter-matches", tradeId],
    queryFn: ({ signal }) =>
      $fetchCounterMatches({ signal, data: { tradeId } }),
    staleTime: 1000 * 60,
  });

/**
 * The viewer's trades on one My trades tab, a page at a time. Nothing
 * pushes live trades, so the Active tab refetches whenever the window
 * regains focus.
 */
export const myTradesQuery = (tab: MyTradesTab) =>
  infiniteQueryOptions({
    queryKey: [...tradesKey, "mine", tab],
    queryFn: ({ signal, pageParam }) =>
      $fetchMyTrades({ signal, data: { tab, cursor: pageParam } }),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: tab === "active" ? "always" : true,
  });

/**
 * The first page has no cursor. Typed as the cursor union so the query
 * infers its page param from it.
 */
const firstPage: MyTradesCursor | undefined = undefined;
