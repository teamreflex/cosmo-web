import { env } from "@/lib/env/server";
import { $fetchObjektsWithComo } from "@/lib/functions/como";
import { buildCalendar } from "@/lib/universal/como";
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/user/by-address/$address/como")({
  server: {
    handlers: {
      /**
       * Endpoint for getting the COMO calendar for a given address.
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

        const url = new URL(request.url);
        const now = url.searchParams.get("now");

        // parse unix timestamp (supports both seconds and milliseconds)
        const timestamp = now ? parseInt(now) : new Date().getTime();
        const date = new Date(
          timestamp < 10000000000 ? timestamp * 1000 : timestamp,
        );

        const objekts = await $fetchObjektsWithComo({
          data: { address: params.address },
        });
        const calendar = buildCalendar(date, objekts);

        return Response.json(calendar);
      },
    },
  },
});
