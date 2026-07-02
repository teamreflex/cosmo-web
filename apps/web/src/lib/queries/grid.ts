import type { ValidArtist } from "@apollo/cosmo/types/common";
import { queryOptions } from "@tanstack/react-query";
import { $fetchGridLedger } from "../functions/grid";

/**
 * Fetch the grid ledger for an address and artist.
 */
export const gridLedgerQuery = (address: string, artist: ValidArtist) =>
  queryOptions({
    queryKey: ["grid-ledger", address, artist],
    queryFn: ({ signal }) =>
      $fetchGridLedger({ signal, data: { address, artist } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
