import { createServerFileRoute } from "@tanstack/react-start/server";
import { db } from "@/lib/server/db";

export const ServerRoute = createServerFileRoute(
  "/api/objekt-list/for-user/$identifier"
).methods({
  /**
   * API route that returns all objekt lists for a given user.
   */
  GET: async ({ params }) => {
    const profile = await db.query.cosmoAccounts.findFirst({
      where: {
        OR: [{ username: params.identifier }, { address: params.identifier }],
      },
      with: {
        objektLists: true,
      },
    });

    return Response.json({ results: profile?.objektLists ?? [] });
  },
});
