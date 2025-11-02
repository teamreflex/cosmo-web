import { createFileRoute } from "@tanstack/react-router";
import { $fetchProgressBreakdown } from "@/lib/server/progress";
import { cacheHeaders } from "@/lib/server/cache";

export const Route = createFileRoute(
  "/api/progress/breakdown/$member/$address",
)({
  server: {
    handlers: {
      /**
       * API route that services the /@:nickname/progress page.
       * Takes an address and a member name, and returns the collection progress breakdown of that member.
       * Cached for 1 hour.
       */
      GET: async ({ params }) => {
        const results = await $fetchProgressBreakdown({
          data: {
            member: params.member,
            address: params.address,
          },
        });

        return Response.json(results, {
          headers: cacheHeaders({ vercel: 60 * 60 }),
        });
      },
    },
  },
});
