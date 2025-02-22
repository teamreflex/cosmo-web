import { withCosmoApi } from "@/lib/server/handlers/withCosmoApi";
import { fetchArtistGridStatus } from "@/lib/server/cosmo/grid";

type Params = {
  grid: string;
};

/**
 * API route that services the /grid/:grid page.
 * Takes a grid slug and returns the user's status/progress for that grid.
 */
export const GET = withCosmoApi<Params>(async ({ ctx, user }) => {
  const { grid } = await ctx.params;
  const result = await fetchArtistGridStatus(user.accessToken, grid);

  return Response.json(result);
});
