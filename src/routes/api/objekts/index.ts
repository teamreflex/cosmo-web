import { createFileRoute } from "@tanstack/react-router";
import { fetchObjektsIndex } from "@/lib/server/objekts/prefetching/objekt-index";
import { parseObjektIndex } from "@/lib/universal/parsers";

export const Route = createFileRoute("/api/objekts/")({
  server: {
    handlers: {
      /**
       * API route that services the /objekts page.
       * Takes all Cosmo filters as query params.
       */
      GET: async ({ request }) => {
        // parse query params
        const url = new URL(request.url);
        const filters = parseObjektIndex(url.searchParams);

        // fetch objekts from the indexer
        const result = await fetchObjektsIndex(filters);

        return Response.json(result);
      },
    },
  },
});
