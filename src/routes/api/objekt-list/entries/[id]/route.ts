import { fetchObjektList } from "@/lib/server/objekts/prefetching/objekt-list";
import { parseObjektList } from "@/lib/universal/parsers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * API route that services the /@:nickname/list/* objekt list page.
 * Takes all Cosmo filters as query params.
 */
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  // parse query params
  const filters = parseObjektList(request.nextUrl.searchParams);

  // fetch objekts from the indexer
  const { results } = await fetchObjektList({
    id: params.id,
    filters,
  });

  return Response.json(results);
}
