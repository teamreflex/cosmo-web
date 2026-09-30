import { m } from "@/i18n/messages";
import { marketQuery } from "@/lib/queries/market";
import { getRouteApi } from "@tanstack/react-router";
import { useArtists } from "./use-artists";
import { useDisplayCurrency } from "./use-display-currency";
import { objektOptions } from "./use-objekt-response";

const route = getRouteApi("/market");

/**
 * The market query for the current search params, artists and display currency.
 */
export function useMarketQuery() {
  const searchParams = route.useSearch();
  const { selectedIds } = useArtists();
  return marketQuery(searchParams, selectedIds, useDisplayCurrency());
}

/**
 * Grid options for the market page: collections with sale listings, sorted by
 * the market aggregate.
 */
export function useMarket() {
  return objektOptions({
    filtering: "remote",
    query: useMarketQuery(),
    calculateTotal: (data) => {
      const totals = data.pages[0]?.totals;
      return (
        <p className="text-xxs text-muted-foreground sm:text-xs">
          {m.market_total({
            collections: (totals?.collections ?? 0).toLocaleString("en"),
            listings: (totals?.listings ?? 0).toLocaleString("en"),
          })}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
