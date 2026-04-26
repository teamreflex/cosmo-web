import { env } from "@/lib/env/server";
import { $fetchArtistStatsByAddress } from "@/lib/functions/progress";
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/user/by-address/$address/stats")({
  server: {
    handlers: {
      /**
       * Endpoint for getting stats about objekts owned by an address
       */
      GET: async ({ request, params }) => {
        const authKey = request.headers.get("Authorization") ?? "";
        const expected = env.AUTH_KEY;
        if (
          authKey.length !== expected.length ||
          !timingSafeEqual(Buffer.from(authKey), Buffer.from(expected))
        ) {
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
