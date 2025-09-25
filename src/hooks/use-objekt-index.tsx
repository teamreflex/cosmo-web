import { ofetch } from "ofetch";
import { useDebounceValue } from "usehooks-ts";
import { useEffect } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useCosmoFilters } from "./use-cosmo-filters";
import { useFilters } from "./use-filters";
import { useArtists } from "./use-artists";
import type { ObjektResponseOptions } from "./use-objekt-response";
import type {
  IndexedObjekt,
  LegacyObjektResponse,
} from "@/lib/universal/objekts";
import { parsePage } from "@/lib/universal/objekts";
import { getTypesenseResults } from "@/lib/client/typesense";
import { baseUrl } from "@/lib/query-client";
import { track } from "@/lib/utils";

const route = getRouteApi("/");

/**
 * Handles switching between the blockchain and Typesense APIs.
 */
export function useObjektIndex() {
  const { search } = route.useSearch();
  const [debouncedSearch] = useDebounceValue(search, 500);
  const { selectedIds } = useArtists();
  const [filters] = useCosmoFilters();
  const { searchParams } = useFilters();

  // track when a user searches for an objekt
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length > 0) {
      track("objekt-search");
    }
  }, [debouncedSearch]);

  // if no search, use the default API
  if (!debouncedSearch) {
    return {
      filtering: "remote",
      queryKey: ["objekt-index", "blockchain"],
      queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
        const url = new URL("/api/objekts", baseUrl());
        return await ofetch(url.toString(), {
          query: {
            ...Object.fromEntries(searchParams.entries()),
            page: pageParam,
            artists: selectedIds,
          },
        }).then((res) => parsePage<LegacyObjektResponse<IndexedObjekt>>(res));
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextStartAfter,
      calculateTotal: (data) => {
        const total = data.pages[0]?.total ?? 0;
        return (
          <p className="font-semibold">{total.toLocaleString("en")} total</p>
        );
      },
      getItems: (data) => data.pages.flatMap((page) => page.objekts),
    } satisfies ObjektResponseOptions<
      LegacyObjektResponse<IndexedObjekt>,
      IndexedObjekt
    >;
  }

  // otherwise, use the typesense API
  return {
    filtering: "remote",
    queryKey: [
      "objekt-index",
      "typesense",
      { search: debouncedSearch || null },
    ],
    queryFunction: async ({ pageParam = 1 }) => {
      return await getTypesenseResults({
        query: debouncedSearch,
        filters: filters,
        page: pageParam,
        artists: selectedIds,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <p className="font-semibold">{total.toLocaleString("en")} total</p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  } satisfies ObjektResponseOptions<
    LegacyObjektResponse<IndexedObjekt>,
    IndexedObjekt
  >;
}
