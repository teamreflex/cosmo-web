import { createFileRoute } from "@tanstack/react-router";
import { fetchTransfers, parseTransfersParams } from "@/lib/server/transfers";

export const Route = createFileRoute("/api/transfers/$address")({
  server: {
    handlers: {
      /**
       * API route that services the /@:nickname/trades page.
       * Fetches all of a user's transfers and maps any known Cosmo IDs onto them.
       */
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const opts = parseTransfersParams(url.searchParams);
        const result = await fetchTransfers(params.address, opts);
        return Response.json(result);
      },
    },
  },
});
