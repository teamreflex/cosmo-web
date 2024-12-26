import {
  GetNextPageParamFunction,
  InfiniteData,
  QueryFunction,
  QueryKey,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { useCosmoFilters } from "./use-cosmo-filters";
import { ReactNode } from "react";

export type ObjektResponseOptions<Response, Item> = {
  queryKey: QueryKey;
  queryFunction: QueryFunction<Response, QueryKey, number | undefined>;
  initialPageParam?: number;
  getNextPageParam: GetNextPageParamFunction<number | undefined, Response>;
  calculateTotal: (data: InfiniteData<Response>) => ReactNode;
  getItems: (data: InfiniteData<Response>) => Item[];
};

export function useObjektResponse<Response, Item>(
  opts: ObjektResponseOptions<Response, Item>
) {
  const [filters] = useCosmoFilters();
  const query = useSuspenseInfiniteQuery({
    queryKey: [...opts.queryKey, filters],
    queryFn: opts.queryFunction,
    initialPageParam: opts.initialPageParam ?? 0,
    getNextPageParam: opts.getNextPageParam,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const total = opts.calculateTotal(query.data);
  const items = opts.getItems(query.data);

  return {
    query,
    total,
    items,
  };
}
