import { desc, eq, or, sql } from "drizzle-orm";
import { collections, transfers, objekts } from "../db/indexer/schema";
import { indexer } from "../db/indexer";
import { AggregatedTransfer, TransferResult } from "@/lib/universal/transfers";

const PER_PAGE = 30;

/**
 * Fetch transfers from the indexer by address.
 */
export async function fetchTransfers(
  address: string,
  page: number
): Promise<TransferResult> {
  const rows = await fetchRows(address, page);
  const { count, results } = aggregateResults(rows);
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
      transfers,
      objekt: objekts,
      collection: collections,
    })
    .from(transfers)
    .where(
      or(
        eq(transfers.from, address.toLowerCase()),
        eq(transfers.to, address.toLowerCase())
      )
    )
    .innerJoin(objekts, eq(transfers.objektId, objekts.id))
    .innerJoin(collections, eq(transfers.collectionId, collections.id))
    .orderBy(desc(transfers.timestamp))
    .limit(PER_PAGE)
    .offset(page * PER_PAGE);
}

/**
 * Map data together from joins.
 */
function aggregateResults(rows: Awaited<ReturnType<typeof fetchRows>>) {
  let count = 0;
  const results = rows.reduce<AggregatedTransfer[]>((acc, row) => {
    count = row.count;
    acc.push({
      transfer: row.transfers,
      objekt: row.objekt,
      collection: row.collection,
    });

    return acc;
  }, []);

  return { count, results };
}
