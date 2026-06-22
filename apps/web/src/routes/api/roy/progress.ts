import { getProgress, resolveUser } from "@/lib/server/3p/roy.server";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const schema = z.object({
  artist: z.string().min(1),
  user: z.string().min(1),
  member: z.string().min(1),
  season: z.string().min(1).optional(),
  class: z.string().min(1).optional(),
});

export const Route = createFileRoute("/api/roy/progress")({
  server: {
    handlers: {
      /**
       * Return the collections a user owns vs. the full catalog for a member.
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
          member: url.searchParams.get("member"),
          season: url.searchParams.get("season") ?? undefined,
          class: url.searchParams.get("class") ?? undefined,
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

        const progress = await getProgress(resolved.address, {
          artist: parsed.data.artist.toLowerCase(),
          member: parsed.data.member,
          season: parsed.data.season ?? null,
          class: parsed.data.class ?? null,
        });

        return Response.json(progress);
      },
    },
  },
});
