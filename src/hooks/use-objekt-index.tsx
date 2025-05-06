import { useQueryState } from "nuqs";
import { useSelectedArtists } from "./use-selected-artists";
import { ofetch } from "ofetch";
import {
  IndexedObjekt,
  LegacyObjektResponse,
  parsePage,
} from "@/lib/universal/objekts";
import { ObjektResponseOptions } from "./use-objekt-response";
import { useCosmoFilters } from "./use-cosmo-filters";
import { useFilters } from "./use-filters";
import { getTypesenseResults } from "@/lib/client/typesense";
import { useDebounceValue } from "usehooks-ts";
import { baseUrl } from "@/lib/query-client";

export function useObjektIndex() {
  const [search] = useQueryState("search");
  const [debouncedSearch] = useDebounceValue(search, 500);
  const { selectedIds } = useSelectedArtists();
  const [filters] = useCosmoFilters();
  const { searchParams } = useFilters();

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
        const total = data.pages[0].total ?? 0;
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
      const total = data.pages[0].total ?? 0;
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
