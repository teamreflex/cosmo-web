import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env/server";
import { fetchObjektsWithComo } from "@/lib/server/como";
import { buildCalendar } from "@/lib/universal/como";

export const Route = createFileRoute("/api/user/by-address/$address/como")({
  server: {
    handlers: {
      /**
       * Endpoint for getting the COMO calendar for a given address.
       */
      GET: async ({ request, params }) => {
        const authKey = request.headers.get("Authorization");
        if (authKey !== env.AUTH_KEY) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 },
          );
        }

        const url = new URL(request.url);
        const now = url.searchParams.get("now");

        // parse unix timestamp (supports both seconds and milliseconds)
        const timestamp = now ? parseInt(now) : new Date().getTime();
        const date = new Date(
          timestamp < 10000000000 ? timestamp * 1000 : timestamp,
        );

        const objekts = await fetchObjektsWithComo({
          data: params.address,
        });
        const calendar = buildCalendar(date, objekts);

        return Response.json(calendar);
      },
    },
  },
});
