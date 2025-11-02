import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/server/db";

export const Route = createFileRoute("/api/objekt-list/for-user/$identifier")({
  server: {
    handlers: {
      /**
       * API route that returns all objekt lists for a given user.
       */
      GET: async ({ params }) => {
        const profile = await db.query.cosmoAccounts.findFirst({
          where: {
            OR: [
              { username: params.identifier },
              { address: params.identifier },
            ],
          },
          with: {
            objektLists: true,
          },
        });

        return Response.json({ results: profile?.objektLists ?? [] });
      },
    },
  },
});
