import { queryOptions } from "@tanstack/react-query";
import {
  fetchObjektsWithComo,
  fetchTokenBalances,
} from "@/lib/server/como";

export const fetchObjektsWithComoQuery = (address: string) =>
  queryOptions({
    queryKey: ["como-calendar", address],
    queryFn: () => fetchObjektsWithComo({ data: { address } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const tokenBalancesQuery = (address: string) =>
  queryOptions({
    queryKey: ["como-balances", address],
    queryFn: () => fetchTokenBalances({ data: { address } }),
    refetchOnWindowFocus: false,
  });
