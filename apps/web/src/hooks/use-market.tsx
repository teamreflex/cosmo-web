import { marketQuery } from "@/lib/queries/market";
import { IconCards } from "@tabler/icons-react";
import { getRouteApi } from "@tanstack/react-router";
import { useArtists } from "./use-artists";
import { useDisplayCurrency } from "./use-display-currency";
import { objektOptions } from "./use-objekt-response";

const route = getRouteApi("/market/collections");

/**
 * Grid options for the market page: collections with sale listings, sorted by
 * the market stats, for the current search params, artists and display
 * currency.
 */
export function useMarket() {
  const searchParams = route.useSearch();
  const { selectedIds } = useArtists();

  return objektOptions({
    filtering: "remote",
    query: marketQuery(searchParams, selectedIds, useDisplayCurrency()),
    calculateTotal: (data) => {
      const listings = data.pages[0]?.totals?.listings ?? 0;
      return (
        <div className="flex items-center gap-2">
          <IconCards className="size-4" />
          <p className="text-xxs tracking-widest text-muted-foreground sm:text-xs">
            {listings.toLocaleString("en")}
          </p>
        </div>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
