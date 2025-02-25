import {
  GetNextPageParamFunction,
  InfiniteData,
  QueryFunction,
  QueryKey,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { useCosmoFilters } from "./use-cosmo-filters";
import { ReactNode } from "react";
import { FilterType } from "@/lib/utils";

export type ObjektResponseOptions<Response, Item> = {
  filtering: FilterType;
  queryKey: QueryKey;
  queryFunction: QueryFunction<Response, QueryKey, number | undefined>;
  initialPageParam?: number;
  getNextPageParam: GetNextPageParamFunction<number | undefined, Response>;
  calculateTotal: (data: InfiniteData<Response>) => ReactNode;
  getItems: (data: InfiniteData<Response>) => Item[];
};

/**
 * Create a new typed options object for the useObjektResponse hook.
 */
export function objektOptions<Response, Item>(
  opts: ObjektResponseOptions<Response, Item>
) {
  return opts;
}

/**
 * Suspense-powered hook to fetch objekts.
 */
export function useObjektResponse<Response, Item>(
  opts: ObjektResponseOptions<Response, Item>
) {
  const [filters] = useCosmoFilters();
  const query = useSuspenseInfiniteQuery({
    queryKey: [
      ...opts.queryKey,
      ...(opts.filtering === "remote" ? [filters] : []),
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
