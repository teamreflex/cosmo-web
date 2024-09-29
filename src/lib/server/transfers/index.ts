import { desc, eq, or, sql } from "drizzle-orm";
import { collections, transfers, objekts } from "../db/indexer/schema";
import { indexer } from "../db/indexer";
import { TransferResult } from "@/lib/universal/transfers";

const PER_PAGE = 30;

/**
 * Fetch transfers from the indexer by address.
 */
export async function fetchTransfers(
  address: string,
  page: number
): Promise<TransferResult> {
  const results = await fetchRows(address, page);
  const count = results.length > 0 ? results[0].count : 0;
  const hasNext = count > (page + 1) * PER_PAGE;

  return {
    results,
    count,
    hasNext,
    nextStartAfter: hasNext ? page + 1 : undefined,
  };
}

/**
 * Fetch transfers from the database.
 */
async function fetchRows(address: string, page: number) {
  return await indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
      transfer: transfers,
      serial: objekts.serial,
      collectionId: collections.collectionId,
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
}
