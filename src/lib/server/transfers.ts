import { and, desc, eq, not, or, sql } from "drizzle-orm";
import { TransferParams, TransferResult } from "../universal/transfers";
import { indexer } from "./db/indexer";
import { collections, objekts, transfers } from "./db/indexer/schema";
import { fetchKnownAddresses } from "./profiles";
import {
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
} from "./objekts/filters";
import { Addresses, isAddressEqual } from "../utils";

const PER_PAGE = 30;

/**
 * Fetches transfers and zips known nicknames into the results.
 */
export async function fetchTransfers(
  address: string,
  params: TransferParams
): Promise<TransferResult> {
  // too much data, bail
  if (isAddressEqual(address, Addresses.NULL)) {
    return {
      results: [],
      count: 0,
      hasNext: false,
      nextStartAfter: undefined,
    };
  }

  const aggregate = await fetchTransferRows(address, params);
  const addresses = aggregate.results
    .flatMap((r) => [r.transfer.from, r.transfer.to])
    // can't send to yourself, so filter out the current address
    .filter((a) => a !== address.toLowerCase());

  const knownAddresses = await fetchKnownAddresses(addresses);

  return {
    ...aggregate,
    // map the nickname onto the results and apply spin flags
    results: aggregate.results.map((row) => ({
      ...row,
      nickname: knownAddresses.find((a) =>
        [
          row.transfer.from.toLowerCase(),
          row.transfer.to.toLowerCase(),
        ].includes(a.userAddress.toLowerCase())
      )?.nickname,
    })),
  };
}

/**
 * Fetch transfers from the indexer by address.
 */
async function fetchTransferRows(
  address: string,
  params: TransferParams
): Promise<TransferResult> {
  const results = await indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
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
          ...withClass(params.class),
          ...withSeason(params.season),
          ...withOnlineType(params.on_offline),
          ...withMember(params.member),
        ]
      )
    )
    .orderBy(desc(transfers.timestamp))
    .limit(PER_PAGE)
    .offset(params.page * PER_PAGE);

  const count = results.length > 0 ? results[0].count : 0;
  const hasNext = count > (params.page + 1) * PER_PAGE;

  return {
    results,
    count,
    hasNext,
    nextStartAfter: hasNext ? params.page + 1 : undefined,
  };
}

/**
 * Filter transfers by type.
 */
function withType(address: string, type: TransferParams["type"]) {
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
        eq(transfers.to, address)
      );
    // address must be a sender to non-burn address
    case "sent":
      return and(
        not(eq(transfers.to, Addresses.NULL)),
        eq(transfers.from, address)
      );
    // address must be a sender to the spin address
    case "spin":
      return and(eq(transfers.to, Addresses.SPIN), eq(transfers.from, address));
  }
}
