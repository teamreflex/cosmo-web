import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { fetchTransfers } from "@/lib/server/transfers";
import { inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

function parseParams(params: URLSearchParams) {
  return {
    page: parseInt(params.get("page") ?? "1"),
  };
}

async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];

  return await db
    .select()
    .from(profiles)
    .where(inArray(profiles.userAddress, addresses));
}
