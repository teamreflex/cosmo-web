import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env/server";
import { fetchArtistStatsByAddress } from "@/lib/server/progress";

export const Route = createFileRoute("/api/user/by-address/$address/stats")({
  server: {
    handlers: {
      /**
       * Endpoint for getting stats about objekts owned by an address
       */
      GET: async ({ request, params }) => {
        const authKey = request.headers.get("Authorization");
        if (authKey !== env.AUTH_KEY) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 },
          );
        }

        const stats = await fetchArtistStatsByAddress({
          data: { address: params.address },
        });

        return Response.json(stats);
      },
    },
  },
});
