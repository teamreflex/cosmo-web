import { fetchPoll } from "@/lib/server/cosmo/gravity";
import { withCosmoApi } from "@/lib/server/handlers/withCosmoApi";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type Params = {
  artist: ValidArtist;
  gravity: number;
  poll: number;
};

/**
 * API route that services the /gravity/:artist/:gravity page.
 * Fetches the poll options for the given gravity.
 */
export const GET = withCosmoApi<Params>(async ({ ctx, user }) => {
  const params = await ctx.params;
  const poll = await fetchPoll(
    user.accessToken,
    params.artist,
    params.gravity,
    params.poll
  );

  return Response.json(poll);
});
