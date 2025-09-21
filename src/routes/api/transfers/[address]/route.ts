import type { NextRequest } from "next/server";
import { fetchTransfers, parseTransfersParams } from "@/lib/server/transfers";

/**
 * API route that services the /@:nickname/trades page.
 * Fetches all of a user's transfers and maps any known Cosmo IDs onto them.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ address: string }> }
) {
  const { address } = await props.params;
  const params = parseTransfersParams(request.nextUrl.searchParams);

  const result = await fetchTransfers(address, params);
  return Response.json(result);
}
