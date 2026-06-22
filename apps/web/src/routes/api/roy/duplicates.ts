import {
  fetchUserObjekts,
  resolveUser,
  type RoyObjektList,
} from "@/lib/server/3p/roy.server";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const schema = z.object({
  artist: z.string().min(1),
  user: z.string().min(1),
  member: z.string().min(1).optional(),
});

export const Route = createFileRoute("/api/roy/duplicates")({
  server: {
    handlers: {
      /**
       * List every objekt a user owns, including duplicates.
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
          member: url.searchParams.get("member") ?? undefined,
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

        const member =
          parsed.data.member && parsed.data.member.toLowerCase() !== "all"
            ? parsed.data.member
            : null;

        const userObjekts = await fetchUserObjekts(resolved.address, {
          artist: parsed.data.artist.toLowerCase(),
          member,
          transferableOnly: false,
        });

        return Response.json({
          nickname: resolved.nickname ?? resolved.address,
          objekts: userObjekts,
        } satisfies RoyObjektList);
      },
    },
  },
});
