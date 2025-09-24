import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { getArtistStatsByAddress } from "@/lib/server/progress";

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
            { status: 401 }
          );
        }

        const stats = await getArtistStatsByAddress(params.address);

        return Response.json(stats);
      },
    },
  },
});
