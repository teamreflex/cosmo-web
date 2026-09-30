import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { searchUsers } from "@/lib/server/user-search.server";
import { userSearchSchema } from "@/lib/universal/schema/cosmo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/user/search")({
  server: {
    handlers: {
      /**
       * Endpoint for searching COSMO users by nickname.
       */
      GET: async ({ request }) => {
        if (!(await verifyRequestApiKey(request))) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 },
          );
        }

        const parsed = userSearchSchema.safeParse({
          query: new URL(request.url).searchParams.get("query"),
        });
        if (!parsed.success) {
          return Response.json(
            { error: "validation error", details: parsed.error.issues },
            { status: 422 },
          );
        }

        return Response.json(
          await searchUsers(parsed.data.query, request.signal),
        );
      },
    },
  },
});
