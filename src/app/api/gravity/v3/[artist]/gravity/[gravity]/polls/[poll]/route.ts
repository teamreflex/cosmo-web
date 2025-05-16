import { fetchPoll } from "@/lib/server/cosmo/gravity";
import { withProxiedToken } from "@/lib/server/handlers/withProxiedToken";
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
export const GET = withProxiedToken<Params>(async ({ ctx, token }) => {
  const params = await ctx.params;
  const poll = await fetchPoll(
    token.accessToken,
    params.artist,
    params.gravity,
    params.poll
  );

  return Response.json(poll);
});
