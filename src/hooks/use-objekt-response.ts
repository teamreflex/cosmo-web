import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useCosmoFilters } from "./use-cosmo-filters";
import { useArtists } from "./use-artists";
import type {
  GetNextPageParamFunction,
  InfiniteData,
  QueryFunction,
  QueryKey,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { FilterType } from "@/lib/utils";

export type ObjektResponseOptions<TResponse, TItem> = {
  filtering: FilterType;
  queryKey: QueryKey;
  queryFunction: QueryFunction<TResponse, QueryKey, number | undefined>;
  initialPageParam?: number;
  getNextPageParam: GetNextPageParamFunction<number | undefined, TResponse>;
  calculateTotal: (data: InfiniteData<TResponse>) => ReactNode;
  getItems: (data: InfiniteData<TResponse>) => TItem[];
};

/**
 * Create a new typed options object for the useObjektResponse hook.
 */
export function objektOptions<TResponse, TItem>(
  opts: ObjektResponseOptions<TResponse, TItem>
) {
  return opts;
}

/**
 * Suspense-powered hook to fetch objekts.
 */
export function useObjektResponse<TResponse, TItem>(
  opts: ObjektResponseOptions<TResponse, TItem>
) {
  const { selectedIds } = useArtists();
  const [filters] = useCosmoFilters();
  const query = useSuspenseInfiniteQuery({
    queryKey: [
      ...opts.queryKey,
      ...(opts.filtering === "remote"
        ? [
            {
              ...filters,
              artists: selectedIds,
            },
          ]
        : []),
    ],
    queryFn: opts.queryFunction,
    initialPageParam: opts.initialPageParam ?? 0,
    getNextPageParam: opts.getNextPageParam,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const items = opts.getItems(query.data);
  const total = opts.calculateTotal(query.data);

  return {
    query,
    total,
    items,
  };
}
