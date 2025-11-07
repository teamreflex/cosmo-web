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
import { m } from "@/i18n/messages";

const route = getRouteApi("/");

/**
 * Handles switching between the blockchain and Typesense APIs.
 * TODO: fix debouncing
 */
export function useObjektIndex() {
  const searchParams = route.useSearch();
  const [debouncedParams] = useDebounceValue(searchParams, 500);
  const { selectedIds } = useArtists();

  // track when a user searches for an objekt
  useEffect(() => {
    if (debouncedParams.search && debouncedParams.search.length > 0) {
      track("objekt-search");
    }
  }, [debouncedParams]);

  // if no search, use the default API
  if (!debouncedParams.search) {
    return objektOptions({
      filtering: "remote",
      query: objektIndexBlockchainQuery(debouncedParams, selectedIds),
      calculateTotal: (data) => {
        const total = data.pages[0]?.total ?? 0;
        return (
          <p className="font-semibold">
            {total.toLocaleString("en")} {m.common_total()}
          </p>
        );
      },
      getItems: (data) => data.pages.flatMap((page) => page.objekts),
    });
  }

  // otherwise, use the typesense API
  return objektOptions({
    filtering: "remote",
    query: objektIndexTypesenseQuery(debouncedParams, selectedIds),
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <p className="font-semibold">
          {total.toLocaleString("en")} {m.common_total()}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });
}
