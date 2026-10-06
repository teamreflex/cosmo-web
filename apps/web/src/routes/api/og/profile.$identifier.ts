import { cacheHeaders } from "@/lib/server/cache.server";
import {
  fetchProfileCard,
  renderProfileCard,
} from "@/lib/server/profile-card.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/og/profile/$identifier")({
  server: {
    handlers: {
      /**
       * OpenGraph image for a profile, shown when its link is shared.
       * Cached for 24 hours (5 minutes for 404).
       */
      GET: async ({ params, request }) => {
        const card = await fetchProfileCard(params.identifier, request.signal);
        if (card === undefined) {
          return new Response("Profile not found", {
            status: 404,
            headers: cacheHeaders({ cdn: 60 * 5 }),
          });
        }

        const image = await renderProfileCard(card);
        return new Response(image, {
          headers: {
            "Content-Type": "image/jpeg",
            ...cacheHeaders({ cdn: 60 * 60 * 24, browser: 60 * 60 }),
          },
        });
      },
    },
  },
});
