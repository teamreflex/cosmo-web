import { $fetchArtistStatsByAddress } from "@/lib/functions/progress";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/user/by-address/$address/stats")({
  server: {
    handlers: {
      /**
       * Endpoint for getting stats about objekts owned by an address
       */
      GET: async ({ request, params }) => {
        if (!(await verifyRequestApiKey(request))) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 },
          );
        }

        const stats = await $fetchArtistStatsByAddress({
          data: { address: params.address },
        });

        return Response.json(stats);
      },
    },
  },
});
