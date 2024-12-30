import { desc, eq, or, sql } from "drizzle-orm";
import { TransferResult } from "../universal/transfers";
import { indexer } from "./db/indexer";
import { collections, objekts, transfers } from "./db/indexer/schema";
import { fetchKnownAddresses } from "./profiles";
import { profiles } from "./db/schema";
import { NULL_ADDRESS } from "../utils";

const PER_PAGE = 30;

/**
 * Fetches transfers and zips known nicknames into the results.
 */
export async function fetchTransfers(
  address: string,
  page: number
): Promise<TransferResult> {
  // too much data, bail
  if (address.toLowerCase() === NULL_ADDRESS) {
    return {
      results: [],
      count: 0,
      hasNext: false,
      nextStartAfter: undefined,
    };
  }

  const aggregate = await fetchTransferRows(address, page);
  const addresses = aggregate.results
    .flatMap((r) => [r.transfer.from, r.transfer.to])
    // can't send to yourself, so filter out the current address
    .filter((a) => a !== address.toLowerCase());

  const knownAddresses = await fetchKnownAddresses(addresses, [
    eq(profiles.privacyTrades, false),
  ]);

  return {
    ...aggregate,
    // map the nickname onto the results
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
  page: number
): Promise<TransferResult> {
  const results = await indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
      transfer: transfers,
      serial: objekts.serial,
      collection: collections,
    })
    .from(transfers)
    .where(
      or(
        eq(transfers.from, address.toLowerCase()),
        eq(transfers.to, address.toLowerCase())
      )
    )
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .orderBy(desc(transfers.timestamp))
    .limit(PER_PAGE)
    .offset(page * PER_PAGE);

  const count = results.length > 0 ? results[0].count : 0;
  const hasNext = count > (page + 1) * PER_PAGE;

  return {
    results,
    count,
    hasNext,
    nextStartAfter: hasNext ? page + 1 : undefined,
  };
}
