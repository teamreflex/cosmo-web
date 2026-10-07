import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts.server";
import { fetchTransferRows } from "@/lib/server/transfers.server";
import { transfersBackendSchema } from "@/lib/universal/parsers";
import type { TransferResult } from "@/lib/universal/transfers";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

/**
 * Fetches transfers and zips known nicknames into the counterparties.
 */
export const $fetchTransfers = createServerFn({ method: "GET" })
  .validator(transfersBackendSchema)
  .handler(async ({ data }): Promise<TransferResult> => {
    // too much data, bail
    if (isEqual(data.address, Addresses.NULL)) {
      return {
        results: [],
        cursor: undefined,
      };
    }

    const aggregate = await fetchTransferRows(data.address, data);
    const addressMap = await fetchKnownAddresses(
      aggregate.results.flatMap((row) =>
        "counterparty" in row ? [row.counterparty.address] : [],
      ),
    );

    return {
      ...aggregate,
      results: aggregate.results.map((row) =>
        "counterparty" in row
          ? {
              ...row,
              counterparty: {
                ...row.counterparty,
                username:
                  addressMap.get(row.counterparty.address)?.username ?? null,
              },
            }
          : row,
      ),
    };
  });
