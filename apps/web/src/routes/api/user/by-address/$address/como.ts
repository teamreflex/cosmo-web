import { $fetchObjektsWithComo } from "@/lib/functions/como";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { buildCalendar } from "@/lib/universal/como";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/user/by-address/$address/como")({
  server: {
    handlers: {
      /**
       * Endpoint for getting the COMO calendar for a given address.
       */
      GET: async ({ request, params }) => {
        if (!(await verifyRequestApiKey(request))) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 },
          );
        }

        const url = new URL(request.url);
        const now = url.searchParams.get("now");
        const tz = url.searchParams.get("tz") ?? "UTC";

        // parse unix timestamp (supports both seconds and milliseconds)
        const timestamp = now ? parseInt(now) : new Date().getTime();
        const date = new Date(
          timestamp < 10000000000 ? timestamp * 1000 : timestamp,
        );

        const objekts = await $fetchObjektsWithComo({
          data: { address: params.address },
        });
        const calendar = buildCalendar(date, objekts, tz);

        return Response.json(calendar);
      },
    },
  },
});
