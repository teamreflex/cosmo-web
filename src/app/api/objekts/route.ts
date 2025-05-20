import { fetchObjektsIndex } from "@/lib/server/objekts/prefetching/objekt-index";
import { parseObjektIndex } from "@/lib/universal/parsers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * API route that services the /objekts page.
 * Takes all Cosmo filters as query params.
 */
export async function GET(request: NextRequest) {
  // parse query params
  const filters = parseObjektIndex(request.nextUrl.searchParams);

  // fetch objekts from the indexer
  const result = await fetchObjektsIndex(filters);

  return Response.json(result);
}
