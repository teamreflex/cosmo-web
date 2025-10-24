import { and, desc, eq, inArray, not, or, sql } from "drizzle-orm";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { Addresses, isEqual } from "../utils";
import { indexer } from "./db/indexer";
import { collections, objekts, transfers } from "./db/indexer/schema";
import { fetchKnownAddresses } from "./cosmo-accounts";
import {
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
} from "./objekts/filters";
import type z from "zod";
import type { TransferResult, TransferType } from "../universal/transfers";
import { transfersBackendSchema } from "@/lib/universal/parsers";

const PER_PAGE = 30;

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
        nextStartAfter: undefined,
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

/**
 * Fetch transfers from the indexer by address.
 */
const fetchTransferRows = createServerOnlyFn(
  async (
    address: string,
    params: z.infer<typeof transfersBackendSchema>,
  ): Promise<TransferResult> => {
    const results = await indexer
      .select({
        transfer: transfers,
        serial: objekts.serial,
        collection: collections,
        isSpin: sql<boolean>`${transfers.to} = ${Addresses.SPIN}`,
      })
      .from(transfers)
      .leftJoin(objekts, eq(transfers.objektId, objekts.id))
      .leftJoin(collections, eq(transfers.collectionId, collections.id))
      .where(
        and(
          // base requirements
          withType(address.toLowerCase(), params.type),
          // additional filters
          ...[
            ...withArtist(params.artist),
            ...withClass(params.class ?? []),
            ...withSeason(params.season ?? []),
            ...withOnlineType(params.on_offline ?? []),
            ...withMember(params.member),
          ],
        ),
      )
      .orderBy(desc(transfers.timestamp))
      .limit(PER_PAGE)
      .offset(params.page * PER_PAGE);

    return {
      results,
      nextStartAfter: results.length === PER_PAGE ? params.page + 1 : undefined,
    };
  },
);

/**
 * Filter transfers by type.
 */
const withType = createServerOnlyFn((address: string, type: TransferType) => {
  switch (type) {
    // address must be either a sender or receiver
    case "all":
      return or(eq(transfers.from, address), eq(transfers.to, address));
    // address must be a receiver while the sender is the burn address/cosmo
    case "mint":
      return and(eq(transfers.from, Addresses.NULL), eq(transfers.to, address));
    // address must be a receiver from non-burn address
    case "received":
      return and(
        not(eq(transfers.from, Addresses.NULL)),
        eq(transfers.to, address),
      );
    // address must be a sender to non-burn address
    case "sent":
      return and(
        not(inArray(transfers.to, [Addresses.NULL, Addresses.SPIN])),
        eq(transfers.from, address),
      );
    // address must be a sender to the spin address
    case "spin":
      return and(eq(transfers.to, Addresses.SPIN), eq(transfers.from, address));
  }
});
