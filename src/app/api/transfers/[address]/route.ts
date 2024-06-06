import { profiles } from "@/lib/server/db/schema";
import { fetchKnownAddresses } from "@/lib/server/profiles";
import { fetchTransfers } from "@/lib/server/transfers";
import { NULL_ADDRESS } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * API route that services the /@:nickname/trades page.
 * Fetches all of a user's transfers and maps any known Cosmo IDs onto them.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
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

  const knownAddresses = await fetchKnownAddresses(
    aggregate.results
      .flatMap((r) => [r.transfer.from, r.transfer.to])
      // can't send to yourself, so filter out the current address
      .filter((a) => a !== params.address.toLowerCase()),
    [eq(profiles.privacyTrades, false)]
  );

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
