import { collections } from "@/lib/server/db/indexer/schema";
import { objekts } from "@/lib/server/db/indexer/schema";
import { indexer } from "@/lib/server/db/indexer";
import { transfers } from "@/lib/server/db/indexer/schema";
import { profiles } from "@/lib/server/db/schema";
import { fetchKnownAddresses } from "@/lib/server/profiles";
import { TransferResult } from "@/lib/universal/transfers";
import { NULL_ADDRESS } from "@/lib/utils";
import { eq, desc, or, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

const PER_PAGE = 30;

/**
 * API route that services the /@:nickname/trades page.
 * Fetches all of a user's transfers and maps any known Cosmo IDs onto them.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ address: string }> }
) {
  const params = await props.params;
  // too much data, bail
  if (params.address.toLowerCase() === NULL_ADDRESS) {
    return Response.json({
      results: [],
      count: 0,
      hasNext: false,
      nextStartAfter: undefined,
    });
  }

  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0");

  const aggregate = await fetchTransfers(params.address, page);
  const addresses = aggregate.results
    .flatMap((r) => [r.transfer.from, r.transfer.to])
    // can't send to yourself, so filter out the current address
    .filter((a) => a !== params.address.toLowerCase());

  const knownAddresses = await fetchKnownAddresses(addresses, [
    eq(profiles.privacyTrades, false),
  ]);

  return Response.json({
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
  });
}

/**
 * Fetch transfers from the indexer by address.
 */
async function fetchTransfers(
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
