import { createFileRoute } from "@tanstack/react-router";
import { clearTag } from "@/lib/server/cache";

export const Route = createFileRoute("/api/cron/objekt-stats")({
  server: {
    handlers: {
      /**
       * Flush the objekt stats cache.
       */
      GET: async () => {
        // TODO: extract into a separate service
        return new Response("unauthorized", {
          status: 401,
        });

        // flush the cache tag
        await clearTag("objekt-stats");

        return new Response("ok");
      },
    },
  },
});
