import {
  fetchUserObjekts,
  resolveUser,
  type RoyCompareResult,
} from "@/lib/server/3p/roy.server";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const schema = z.object({
  artist: z.string().min(1),
  user1: z.string().min(1),
  user2: z.string().min(1),
  member: z.string().min(1).optional(),
});

export const Route = createFileRoute("/api/roy/compare")({
  server: {
    handlers: {
      /**
       * Compare two users' collections (user1 full, user2 tradeable-only).
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
          user1: url.searchParams.get("user1"),
          user2: url.searchParams.get("user2"),
          member: url.searchParams.get("member") ?? undefined,
        });

        if (!parsed.success) {
          return Response.json(
            { error: "validation error", details: parsed.error.issues },
            { status: 422 },
          );
        }

        const artist = parsed.data.artist.toLowerCase();
        const member = normalizeMember(parsed.data.member);

        const [first, second] = await Promise.all([
          resolveUser(parsed.data.user1),
          resolveUser(parsed.data.user2),
        ]);

        if (!first) {
          return Response.json({ error: "user1 not found" }, { status: 404 });
        }
        if (!second) {
          return Response.json({ error: "user2 not found" }, { status: 404 });
        }

        const [user1Objekts, user2Objekts] = await Promise.all([
          fetchUserObjekts(first.address, {
            artist,
            member,
            transferableOnly: false,
          }),
          fetchUserObjekts(second.address, {
            artist,
            member,
            transferableOnly: true,
          }),
        ]);

        return Response.json({
          user1: {
            nickname: first.nickname ?? first.address,
            objekts: user1Objekts,
          },
          user2: {
            nickname: second.nickname ?? second.address,
            objekts: user2Objekts,
          },
        } satisfies RoyCompareResult);
      },
    },
  },
});

/**
 * Normalize a member filter, treating absent or "All" as no filter.
 */
function normalizeMember(member: string | undefined): string | null {
  return member && member.toLowerCase() !== "all" ? member : null;
}
