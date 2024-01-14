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
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0");

  const aggregate = await fetchTransfers(params.address, page);

  const knownAddresses = await fetchKnownAddresses(
    aggregate.results
      .flatMap((r) => [r.transfer.from, r.transfer.to])
      // can't send to yourself, so filter out the current address
      .filter((a) => a !== params.address.toLowerCase())
  );

  // uses the latest profile for each address instead of the first
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
