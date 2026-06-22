import { getProfile, resolveUser } from "@/lib/server/3p/roy.server";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const schema = z.object({
  artist: z.string().min(1),
  user: z.string().min(1),
});

export const Route = createFileRoute("/api/roy/profile")({
  server: {
    handlers: {
      /**
       * Return heavy aggregated profile stats for a user. Cached aggressively.
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
          user: url.searchParams.get("user"),
        });

        if (!parsed.success) {
          return Response.json(
            { error: "validation error", details: parsed.error.issues },
            { status: 422 },
          );
        }

        const resolved = await resolveUser(parsed.data.user);
        if (!resolved) {
          return Response.json({ error: "user not found" }, { status: 404 });
        }

        const profile = await getProfile(
          resolved,
          parsed.data.artist.toLowerCase(),
        );

        return Response.json(profile);
      },
    },
  },
});
