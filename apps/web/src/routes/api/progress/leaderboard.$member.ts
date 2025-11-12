import { createFileRoute } from "@tanstack/react-router";
import { $fetchProgressLeaderboard } from "@/lib/server/progress";
import { cacheHeaders } from "@/lib/server/cache";
import { progressLeaderboardBackendSchema } from "@/lib/universal/parsers";

export const Route = createFileRoute("/api/progress/leaderboard/$member")({
  validateSearch: progressLeaderboardBackendSchema,
  server: {
    handlers: {
      /**
       * API route that services the progress leaderboard component.
       * Takes a member name, and returns the progress leaderboard for that member.
       * Cached for 1 hour.
       */
      GET: async ({ params, request }) => {
        // parse search params
        const url = new URL(request.url);
        const searchParams = url.searchParams;

        const results = await $fetchProgressLeaderboard({
          data: {
            member: params.member,
            onlineType: searchParams.get("filter"),
            season: searchParams.get("season"),
          },
        });

        return Response.json(results, {
          headers: cacheHeaders({ cdn: 60 * 60 }),
        });
      },
    },
  },
});
