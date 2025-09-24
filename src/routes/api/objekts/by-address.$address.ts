import { createFileRoute } from "@tanstack/react-router";
import { fetchObjektsBlockchain } from "@/lib/server/objekts/prefetching/objekt-blockchain";
import { parseUserCollection } from "@/lib/universal/parsers";

export const Route = createFileRoute("/api/objekts/by-address/$address")({
  server: {
    handlers: {
      /**
       * API route that services the user collection page when using the blockchain as a data source.
       * Takes all Cosmo filters as query params.
       */
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const filters = parseUserCollection(url.searchParams);
        const result = await fetchObjektsBlockchain(params.address, filters);
        return Response.json(result);
      },
    },
  },
});
