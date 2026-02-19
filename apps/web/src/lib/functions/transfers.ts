import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts.server";
import { fetchTransferRows } from "@/lib/server/transfers.server";
import { transfersBackendSchema } from "@/lib/universal/parsers";
import type { TransferResult } from "@/lib/universal/transfers";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

/**
 * Fetches transfers and zips known nicknames into the results.
 */
export const $fetchTransfers = createServerFn({ method: "GET" })
  .inputValidator(transfersBackendSchema)
  .handler(async ({ data }): Promise<TransferResult> => {
    // too much data, bail
    if (isEqual(data.address, Addresses.NULL)) {
      return {
        results: [],
        cursor: undefined,
      };
    }

    const aggregate = await fetchTransferRows(data.address, data);
    const addresses = aggregate.results
      .flatMap((r) => [r.transfer.from, r.transfer.to])
      // can't send to yourself, so filter out the current address
      .filter((a) => a !== data.address.toLowerCase());

    const addressMap = await fetchKnownAddresses(addresses);

    return {
      ...aggregate,
      // map the nickname onto the results and apply spin flags
      results: aggregate.results.map((row) => {
        const fromAddress = row.transfer.from.toLowerCase();
        const toAddress = row.transfer.to.toLowerCase();
        return {
          ...row,
          username:
            addressMap.get(fromAddress)?.username ??
            addressMap.get(toAddress)?.username,
        };
      }),
    };
  });
