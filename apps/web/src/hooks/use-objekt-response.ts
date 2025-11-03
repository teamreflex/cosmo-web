import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import type {
  DataTag,
  DefaultError,
  InfiniteData,
  QueryKey,
  UnusedSkipTokenInfiniteOptions,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { FilterType } from "@apollo/util";

export type ObjektResponseOptions<
  TResponse,
  TItem,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
> = {
  filtering: FilterType;
  query: UnusedSkipTokenInfiniteOptions<
    TResponse,
    TError,
    InfiniteData<TResponse>,
    TQueryKey,
    number
  > & {
    queryKey: DataTag<TQueryKey, InfiniteData<TResponse>, TError>;
  };
  calculateTotal: (data: InfiniteData<TResponse>) => ReactNode;
  getItems: (data: InfiniteData<TResponse>) => TItem[];
};

/**
 * Create a new typed options object for the useObjektResponse hook.
 */
export function objektOptions<
  TResponse,
  TItem,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>(opts: ObjektResponseOptions<TResponse, TItem, TError, TQueryKey>) {
  return opts;
}

/**
 * Suspense-powered hook to fetch objekts.
 */
export function useObjektResponse<
  TResponse,
  TItem,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>(opts: ObjektResponseOptions<TResponse, TItem, TError, TQueryKey>) {
  const query = useSuspenseInfiniteQuery(opts.query);

  const items = opts.getItems(query.data);
  const total = opts.calculateTotal(query.data);

  return {
    query,
    total,
    items,
  };
}
