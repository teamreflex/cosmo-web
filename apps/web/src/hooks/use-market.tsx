import { m } from "@/i18n/messages";
import { marketQuery } from "@/lib/queries/market";
import { getRouteApi } from "@tanstack/react-router";
import { useArtists } from "./use-artists";
import { objektOptions } from "./use-objekt-response";

const route = getRouteApi("/market");

/**
 * Grid options for the market page: collections with sale listings, sorted by
 * the market aggregate.
 */
export function useMarket() {
  const searchParams = route.useSearch();
  const { selectedIds } = useArtists();

  return objektOptions({
    filtering: "remote",
    query: marketQuery(searchParams, selectedIds),
    calculateTotal: (data) => {
      const first = data.pages[0];
      return (
        <p className="text-xxs text-muted-foreground sm:text-xs">
          {m.market_total({
            collections: (first?.total ?? 0).toLocaleString("en"),
            listings: (first?.listingTotal ?? 0).toLocaleString("en"),
          })}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
