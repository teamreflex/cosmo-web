import { m } from "@/i18n/messages";
import { myListingsQuery } from "@/lib/queries/market";
import { getRouteApi } from "@tanstack/react-router";
import { objektOptions } from "./use-objekt-response";

const route = getRouteApi("/market/my");

/**
 * The my listings query for the current search params.
 */
export function useMyListingsQuery() {
  return myListingsQuery(route.useSearch());
}

/**
 * Grid options for my listings: the viewer's sale serials with their market standing.
 */
export function useMyListings() {
  return objektOptions({
    filtering: "remote",
    query: useMyListingsQuery(),
    calculateTotal: (data) => {
      const summary = data.pages[0]?.summary;
      return (
        <p className="text-xxs text-muted-foreground sm:text-xs">
          {m.my_listings_total({
            serials: (summary?.serials ?? 0).toLocaleString("en"),
            lists: (summary?.lists ?? 0).toLocaleString("en"),
          })}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
