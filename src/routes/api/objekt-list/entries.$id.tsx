import { createServerFileRoute } from "@tanstack/react-start/server";
import { fetchObjektList } from "@/lib/server/objekts/prefetching/objekt-list";
import { parseObjektList } from "@/lib/universal/parsers";

export const ServerRoute = createServerFileRoute(
  "/api/objekt-list/entries/$id"
).methods({
  /**
   * API route that services the /@:nickname/list/* objekt list page.
   * Takes all Cosmo filters as query params.
   */
  GET: async ({ params, request }) => {
    // parse query params
    const url = new URL(request.url);
    const filters = parseObjektList(url.searchParams);

    // fetch objekts from the indexer
    const { results } = await fetchObjektList({
      id: params.id,
      filters,
    });

    return Response.json(results);
  },
});
