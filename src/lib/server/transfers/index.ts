import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { collections, transfers, objekts } from "../db/indexer/schema";
import { indexer } from "../db/indexer";
import {
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
} from "../objekts/filters";
import { ParsedObjektParams } from "@/lib/universal/objekts";
import { AggregatedTransfer, TransferResult } from "@/lib/universal/transfers";

const PER_PAGE = 30;

/**
 * Fetch transfers from the indexer by address.
 */
export async function fetchTransfers(
  address: string,
  filters: ParsedObjektParams
): Promise<TransferResult> {
  const rows = await fetchRows(address, filters);
  const { count, results } = aggregateResults(rows);
  const hasNext = count > (filters.page + 1) * PER_PAGE;

  return {
    results,
    count,
    hasNext,
    nextStartAfter: hasNext ? filters.page + 2 : undefined,
  };
}

async function fetchRows(address: string, filters: ParsedObjektParams) {
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
    .innerJoin(
      collections,
      and(
        eq(transfers.collectionId, collections.id),
        ...[
          ...withArtist(filters.artist),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
        ]
      )
    )
    .orderBy(
      filters.sort === "newest"
        ? desc(transfers.timestamp)
        : asc(transfers.timestamp)
    )
    .limit(PER_PAGE)
    .offset(filters.page * PER_PAGE);
}

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
