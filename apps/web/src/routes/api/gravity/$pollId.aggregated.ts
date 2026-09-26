import { cacheHeaders } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import {
  fetchAggregatedGravityData,
  isPolygonGravity,
} from "@/lib/server/gravity.server";
import { createFileRoute } from "@tanstack/react-router";
import { isPast } from "date-fns";
import * as z from "zod";

const pollIdSchema = z.string().regex(/^\d+$/).transform(Number);

export const Route = createFileRoute("/api/gravity/$pollId/aggregated")({
  server: {
    handlers: {
      /**
       * API route that returns aggregated gravity vote data.
       * Returns chart data, top 50 votes, top 25 users, and final
       * per-candidate totals once every vote is revealed.
       */
      GET: async ({ params }) => {
        const parsed = pollIdSchema.safeParse(params.pollId);
        if (!parsed.success) {
          return Response.json({ error: "Invalid poll ID" }, { status: 422 });
        }
        const pollId = parsed.data;

        // fetch poll dates from database
        const poll = await db.query.gravityPolls.findFirst({
          where: { cosmoId: pollId },
          columns: {
            cosmoId: true,
            pollIdOnChain: true,
            startDate: true,
            endDate: true,
          },
          with: {
            gravity: {
              columns: {
                cosmoId: true,
                artist: true,
                endDate: true,
              },
            },
          },
        });
        if (!poll?.startDate || !poll?.endDate) {
          return Response.json({ error: "Poll not found" }, { status: 404 });
        }

        const result = await fetchAggregatedGravityData({
          cosmoId: poll.cosmoId,
          pollIdOnChain: poll.pollIdOnChain,
          startDate: poll.startDate,
          endDate: poll.endDate,
          gravity: poll.gravity,
        });

        /**
         * using the poll end doesn't work for caching because it's when reveals start,
         * so we use the gravity end date instead, which is usually +1h from the poll end.
         * polygon data can never change again, so it caches for longer.
         *
         * live polls get a short CDN cache so concurrent viewers (each polling
         * every 30s) collapse into one vote aggregation per interval. browser
         * cache is disabled so a client's own 30s poll never hits its disk.
         */
        const headers = isPast(poll.gravity.endDate)
          ? cacheHeaders({
              cdn: isPolygonGravity(poll.gravity.endDate)
                ? 60 * 60 * 24 * 30
                : 60 * 60 * 24 * 7,
              tags: ["gravity", `gravity:${pollId}`],
            })
          : cacheHeaders({
              cdn: 15,
              browser: 0,
              tags: ["gravity", `gravity:${pollId}`],
            });

        return Response.json(result, {
          headers,
        });
      },
    },
  },
});
