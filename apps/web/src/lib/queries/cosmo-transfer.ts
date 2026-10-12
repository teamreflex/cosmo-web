import {
  $searchCosmoTransferSources,
  $searchCosmoTransferTargets,
} from "@/lib/functions/cosmo-transfer";
import { queryOptions } from "@tanstack/react-query";

export const cosmoTransferSourcesQuery = (query: string) =>
  queryOptions({
    queryKey: ["admin", "cosmo-transfer", "from", query],
    queryFn: ({ signal }) =>
      $searchCosmoTransferSources({ signal, data: { query } }),
  });

export const cosmoTransferTargetsQuery = (query: string) =>
  queryOptions({
    queryKey: ["admin", "cosmo-transfer", "to", query],
    queryFn: ({ signal }) =>
      $searchCosmoTransferTargets({ signal, data: { query } }),
  });
