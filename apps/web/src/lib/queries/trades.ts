import {
  $fetchMyTrades,
  $fetchTrade,
  $fetchTradesNeedingYou,
} from "@/lib/functions/trades";
import type { MyTradesTab } from "@/lib/universal/trades";
import { queryOptions } from "@tanstack/react-query";

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

export const myTradesQuery = (tab: MyTradesTab) =>
  queryOptions({
    queryKey: [...tradesKey, "mine", tab],
    queryFn: ({ signal }) => $fetchMyTrades({ signal, data: { tab } }),
  });

/**
 * How many accepted trades wait on the viewer, beside every link to My
 * trades. Fetched on the client only.
 */
export const tradesNeedingYouQuery = queryOptions({
  queryKey: [...tradesKey, "needs-you"],
  queryFn: ({ signal }) => $fetchTradesNeedingYou({ signal }),
});
