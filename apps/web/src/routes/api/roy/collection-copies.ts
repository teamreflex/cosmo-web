import { getCollectionCopies } from "@/lib/server/3p/roy.server";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const schema = z.object({
  artist: z.string().min(1),
  season: z.string().min(1),
  collectionNo: z.string().min(1),
});

export const Route = createFileRoute("/api/roy/collection-copies")({
  server: {
    handlers: {
      /**
       * Count copies of a collection number per member.
       */
      GET: async ({ request }) => {
        if (!(await verifyRequestApiKey(request))) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 },
          );
        }

        const url = new URL(request.url);
        const parsed = schema.safeParse({
          artist: url.searchParams.get("artist"),
          season: url.searchParams.get("season"),
          collectionNo: url.searchParams.get("collectionNo"),
        });

        if (!parsed.success) {
          return Response.json(
            { error: "validation error", details: parsed.error.issues },
            { status: 422 },
          );
        }

        const copies = await getCollectionCopies({
          artist: parsed.data.artist.toLowerCase(),
          season: parsed.data.season,
          collectionNo: parsed.data.collectionNo.toUpperCase(),
        });

        if (!copies) {
          return Response.json(
            { error: "collection not found" },
            { status: 404 },
          );
        }

        return Response.json(copies);
      },
    },
  },
});
