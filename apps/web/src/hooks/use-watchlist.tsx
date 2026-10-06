import { watchlistQuery } from "@/lib/queries/watchlist";
import { IconEye } from "@tabler/icons-react";
import { getRouteApi } from "@tanstack/react-router";
import { objektOptions } from "./use-objekt-response";

const route = getRouteApi("/market/watchlist");

/**
 * The watchlist query for the current search params.
 */
export function useWatchlistQuery() {
  return watchlistQuery(route.useSearch());
}

/**
 * Grid options for the watchlist: watched collections with their market stats.
 */
export function useWatchlist() {
  return objektOptions({
    filtering: "remote",
    query: useWatchlistQuery(),
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <div className="flex items-center gap-2">
          <IconEye className="size-4" />
          <p className="text-xxs tracking-widest text-muted-foreground sm:text-xs">
            {total.toLocaleString("en")}
          </p>
        </div>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
