import { NextRequest } from "next/server";
import { fetchTransfers } from "@/lib/server/transfers";
import { parse } from "@/lib/universal/parsers";
import { transfersSchema } from "@/lib/universal/transfers";

/**
 * API route that services the /@:nickname/trades page.
 * Fetches all of a user's transfers and maps any known Cosmo IDs onto them.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ address: string }> }
) {
  const { address } = await props.params;
  const params = parseParams(request.nextUrl.searchParams);

  const result = await fetchTransfers(address, params);
  return Response.json(result);
}

function parseParams(params: URLSearchParams) {
  return parse(
    transfersSchema,
    {
      page: params.get("page"),
      type: params.get("type") ?? "all",
      member: params.get("member"),
      artist: params.get("artist"),
      season: params.getAll("season"),
      class: params.getAll("class"),
      on_offline: params.getAll("on_offline"),
    },
    {
      page: 0,
      type: "all",
      member: null,
      artist: null,
      season: [],
      class: [],
      on_offline: [],
    }
  );
}
