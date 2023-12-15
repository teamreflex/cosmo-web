import { fetchTransfers } from "@/lib/server/transfers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const { page } = parseParams(request.nextUrl.searchParams);

  const results = await fetchTransfers(params.address, {
    page,
    sort: "newest",
    season: [],
    class: [],
    on_offline: [],
    collectionNo: [],
  });

  return NextResponse.json(results);
}

function parseParams(params: URLSearchParams) {
  return {
    page: parseInt(params.get("page") ?? "1"),
  };
}
