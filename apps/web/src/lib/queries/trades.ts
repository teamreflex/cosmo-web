import { $fetchMyTrades, $fetchTrade } from "@/lib/functions/trades";
import type { MyTradesTab } from "@/lib/universal/trades";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/**
 * Every trade query. Their answers depend on who is signed in, so
 * removeViewerQueries clears the prefix on account changes, and trade
 * actions invalidate it.
 */
export const tradesKey = ["trades"] as const;

export const tradeQuery = (id: string) =>
  queryOptions({
    queryKey: [...tradesKey, "detail", id],
    queryFn: ({ signal }) => $fetchTrade({ signal, data: { tradeId: id } }),
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
const firstPage: string | undefined = undefined;
