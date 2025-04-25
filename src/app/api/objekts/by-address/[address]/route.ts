import { fetchObjektsBlockchain } from "@/lib/server/objekts/prefetching/objekt-blockchain";
import { parseUserCollection } from "@/lib/universal/parsers";
import { NextRequest } from "next/server";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

/**
 * API route that services the user collection page when using the blockchain as a data source.
 * Takes all Cosmo filters as query params.
 */
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  const filters = parseUserCollection(request.nextUrl.searchParams);
  const result = await fetchObjektsBlockchain(params.address, filters);
  return Response.json(result);
}
