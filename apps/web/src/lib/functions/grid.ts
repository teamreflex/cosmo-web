import {
  fetchGridCatalog,
  fetchGridMembers,
  fetchNonTransferableGridTokens,
  fetchOwnedGridCounts,
} from "@/lib/server/grid.server";
import type { GridLedger } from "@/lib/universal/grid";
import { buildGridLedger } from "@/lib/universal/grid";
import { gridLedgerSchema } from "@/lib/universal/schema/grid";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

/**
 * Fetch the grid ledger for an address and artist. Public read, like progress.
 */
export const $fetchGridLedger = createServerFn({ method: "GET" })
  .validator(gridLedgerSchema)
  .handler(async ({ data }): Promise<GridLedger> => {
    // the SPIN account holds millions of objekts and never grids; skip it
    if (isEqual(data.address, Addresses.SPIN)) {
      return {
        artist: data.artist,
        members: [],
        units: data.artist === "idntt" ? [] : null,
      };
    }

    const [catalog, owned, nonTransferableTokens, memberOrder] =
      await Promise.all([
        fetchGridCatalog(data.artist),
        fetchOwnedGridCounts(data.address, data.artist),
        fetchNonTransferableGridTokens(data.address, data.artist),
        fetchGridMembers(data.artist),
      ]);

    return buildGridLedger({
      artist: data.artist,
      catalog,
      owned,
      nonTransferableTokens,
      memberOrder,
    });
  });
