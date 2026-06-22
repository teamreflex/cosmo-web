import { getCollection } from "@/lib/server/3p/roy.server";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const schema = z.object({
  artist: z.string().min(1),
  member: z.string().min(1),
  season: z.string().min(1),
  collectionNo: z.string().min(1),
});

export const Route = createFileRoute("/api/roy/collection")({
  server: {
    handlers: {
      /**
       * Look up a single collection with supply, last transfer, and metadata.
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
          member: url.searchParams.get("member"),
          season: url.searchParams.get("season"),
          collectionNo: url.searchParams.get("collectionNo"),
        });

        if (!parsed.success) {
          return Response.json(
            { error: "validation error", details: parsed.error.issues },
            { status: 422 },
          );
        }

        const collection = await getCollection({
          artist: parsed.data.artist.toLowerCase(),
          member: parsed.data.member,
          season: parsed.data.season,
          collectionNo: parsed.data.collectionNo.toUpperCase(),
        });

        if (!collection) {
          return Response.json(
            { error: "collection not found" },
            { status: 404 },
          );
        }

        return Response.json(collection);
      },
    },
  },
});
