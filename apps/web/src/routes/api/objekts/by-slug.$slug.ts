import { cacheHeaders } from "@/lib/server/cache";
import { indexer } from "@/lib/server/db/indexer";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/objekts/by-slug/$slug")({
  server: {
    handlers: {
      /**
       * API route for individual objekt dialogs.
       * Fetches a single objekt from the database.
       * Cached for 24 hours (4 hours for 404).
       */
      GET: async ({ params }) => {
        const collection = await indexer.query.collections.findFirst({
          where: {
            slug: params.slug,
          },
        });

        if (!collection) {
          return Response.json(
            { message: "Collection not found" },
            { status: 404, headers: cacheHeaders({ cdn: 60 * 60 * 4 }) },
          );
        }

        const common = Objekt.fromIndexer(collection);
        return Response.json(common, {
          headers: cacheHeaders({ cdn: 60 * 60 * 24 }),
        });
      },
    },
  },
});
