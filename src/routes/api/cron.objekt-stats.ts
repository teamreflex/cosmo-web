import { createServerFileRoute } from "@tanstack/react-start/server";
import { env } from "@/env";
import { clearTag } from "@/lib/server/cache";

export const ServerRoute = createServerFileRoute(
  "/api/cron/objekt-stats"
).methods({
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
    clearTag("objekt-stats");

    return new Response("ok");
  },
});
