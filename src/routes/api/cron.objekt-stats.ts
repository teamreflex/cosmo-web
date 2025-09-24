import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { clearTag } from "@/lib/server/cache";

export const Route = createFileRoute("/api/cron/objekt-stats")({
  server: {
    handlers: {
      /**
       * Flush the objekt stats cache.
       */
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
          return new Response("unauthorized", {
            status: 401,
          });
        }

        // flush the cache tag
        await clearTag("objekt-stats");

        return new Response("ok");
      },
    },
  },
});
