import { createFileRoute } from "@tanstack/react-router";
import { fetchObjektList } from "@/lib/server/objekts/prefetching/objekt-list";
import { parseObjektList } from "@/lib/universal/parsers";

export const Route = createFileRoute("/api/objekt-list/entries/$id")({
  server: {
    handlers: {
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
    },
  },
});
