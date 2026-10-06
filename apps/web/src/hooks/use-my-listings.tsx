import { myListingsQuery } from "@/lib/queries/market";
import { IconCards } from "@tabler/icons-react";
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
      const serials = data.pages[0]?.summary?.serials ?? 0;
      return (
        <div className="flex items-center gap-2">
          <IconCards className="size-4" />
          <p className="text-xxs tracking-widest text-muted-foreground sm:text-xs">
            {serials.toLocaleString("en")}
          </p>
        </div>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
