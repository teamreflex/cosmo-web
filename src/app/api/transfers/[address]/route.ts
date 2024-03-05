import { fetchKnownAddresses } from "@/lib/server/profiles";
import { fetchTransfers } from "@/lib/server/transfers";
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

  return NextResponse.json({
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
