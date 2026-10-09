import {
  $fetchCosmoLinkHistory,
  $searchCosmoLinkHistory,
} from "@/lib/functions/cosmo-link-history";
import { queryOptions } from "@tanstack/react-query";

export const cosmoLinkHistorySearchQuery = (query: string) =>
  queryOptions({
    queryKey: ["admin", "cosmo-link-history", "search", query],
    queryFn: ({ signal }) =>
      $searchCosmoLinkHistory({ signal, data: { query } }),
  });

export const cosmoLinkHistoryQuery = (cosmoAccountId: number) =>
  queryOptions({
    queryKey: ["admin", "cosmo-link-history", cosmoAccountId],
    queryFn: ({ signal }) =>
      $fetchCosmoLinkHistory({ signal, data: { cosmoAccountId } }),
  });
