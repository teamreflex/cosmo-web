import { NextRequest } from "next/server";
import { fetchTransfers } from "@/lib/server/transfers";

/**
 * API route that services the /@:nickname/trades page.
 * Fetches all of a user's transfers and maps any known Cosmo IDs onto them.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ address: string }> }
) {
  const params = await props.params;
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0");

  const result = await fetchTransfers(params.address, page);
  return Response.json(result);
}
