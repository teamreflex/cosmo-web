import {
  $fetchMyTrades,
  $fetchTrade,
  $fetchTradesNeedingYou,
} from "@/lib/functions/trades";
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

// the viewer's live trades, which also give My trades its counts
export const activeTradesQuery = queryOptions({
  queryKey: [...tradesKey, "mine", "active"],
  queryFn: ({ signal }) => $fetchMyTrades({ signal, data: { tab: "active" } }),
});

export const finishedTradesQuery = () =>
  infiniteQueryOptions({
    queryKey: [...tradesKey, "mine", "finished"],
    queryFn: ({ signal, pageParam }) =>
      $fetchMyTrades({ signal, data: { tab: "finished", cursor: pageParam } }),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

/**
 * How many accepted trades wait on the viewer, beside every link to My
 * trades. Fetched on the client only.
 */
export const tradesNeedingYouQuery = queryOptions({
  queryKey: [...tradesKey, "needs-you"],
  queryFn: ({ signal }) => $fetchTradesNeedingYou({ signal }),
});

/**
 * The first page has no cursor. Typed as the cursor union so the query
 * infers its page param from it.
 */
const firstPage: string | undefined = undefined;
