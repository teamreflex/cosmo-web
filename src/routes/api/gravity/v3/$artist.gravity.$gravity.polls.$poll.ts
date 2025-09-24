import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { getProxiedToken } from "@/lib/server/handlers/withProxiedToken";
import { fetchPoll } from "@/lib/server/cosmo/gravity";
import { validArtists } from "@/lib/universal/cosmo/common";

const schema = z.object({
  artist: z.enum(validArtists),
  gravity: z.coerce.number(),
  poll: z.coerce.number(),
});

export const Route = createFileRoute(
  "/api/gravity/v3/$artist/gravity/$gravity/polls/$poll"
)({
  server: {
    handlers: {
      /**
       * API route that services the /gravity/:artist/:gravity page.
       * Fetches the poll options for the given gravity.
       */
      GET: async ({ params }) => {
        const result = schema.safeParse(params);
        if (!result.success) {
          return Response.json(
            { error: "Invalid parameters" },
            { status: 422 }
          );
        }

        const token = await getProxiedToken();
        const poll = await fetchPoll(
          token.accessToken,
          result.data.artist,
          result.data.gravity,
          result.data.poll
        );

        return Response.json(poll);
      },
    },
  },
});
