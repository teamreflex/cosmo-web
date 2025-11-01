import { useDebounceValue } from "usehooks-ts";
import { useEffect } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useArtists } from "./use-artists";
import { objektOptions } from "./use-objekt-response";
import { track } from "@/lib/utils";
import {
  objektIndexBlockchainQuery,
  objektIndexTypesenseQuery,
} from "@/lib/queries/objekt-queries";
import * as m from "@/i18n/messages";

const route = getRouteApi("/");

/**
 * Handles switching between the blockchain and Typesense APIs.
 */
export function useObjektIndex() {
  const searchParams = route.useSearch();
  const [debouncedSearch] = useDebounceValue(searchParams.search, 500);
  const { selectedIds } = useArtists();

  // track when a user searches for an objekt
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length > 0) {
      track("objekt-search");
    }
  }, [debouncedSearch]);

  // if no search, use the default API
  if (!debouncedSearch) {
    return objektOptions({
      filtering: "remote",
      query: objektIndexBlockchainQuery(searchParams, selectedIds),
      calculateTotal: (data) => {
        const total = data.pages[0]?.total ?? 0;
        return (
          <p className="font-semibold">{total.toLocaleString("en")} {m.common_total()}</p>
        );
      },
      getItems: (data) => data.pages.flatMap((page) => page.objekts),
    });
  }

  // otherwise, use the typesense API
  return objektOptions({
    filtering: "remote",
    query: objektIndexTypesenseQuery(searchParams, selectedIds),
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <p className="font-semibold">{total.toLocaleString("en")} {m.common_total()}</p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
