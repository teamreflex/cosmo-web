import { $fetchTrade } from "@/lib/functions/trades";
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
