import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { fetchTransfers } from "@/lib/server/transfers";
import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * API route that services the /@:nickname/trades page.
 * Fetches all of a user's transfers and maps any known Cosmo IDs onto them.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const { page } = parseParams(request.nextUrl.searchParams);

  const aggregate = await fetchTransfers(params.address, {
    page,
    sort: "newest",
    season: [],
    class: [],
    on_offline: [],
    collectionNo: [],
  });

  const knownAddresses = await fetchKnownAddresses(
    aggregate.results
      .flatMap((r) => [r.transfer.from, r.transfer.to])
      // can't send to yourself, so filter out the current address
      .filter((a) => a !== params.address.toLowerCase())
  );

  const deduplicatedAddresses = knownAddresses.filter((profile, _, arr) => {
    return !arr.some(
      (p) => p.userAddress === profile.userAddress && p.id > profile.id
    );
  });

  return NextResponse.json({
    ...aggregate,
    // map the nickname onto the results
    results: aggregate.results.map((row) => ({
      ...row,
      nickname: deduplicatedAddresses.find((a) =>
        [
          row.transfer.from.toLowerCase(),
          row.transfer.to.toLowerCase(),
        ].includes(a.userAddress.toLowerCase())
      )?.nickname,
    })),
  });
}

/**
 * Parse URL params.
 */
function parseParams(params: URLSearchParams) {
  return {
    page: parseInt(params.get("page") ?? "1"),
  };
}

/**
 * Fetch all known addresses from the database.
 */
async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];

  return await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.privacyTrades, false),
        inArray(profiles.userAddress, addresses)
      )
    );
}
