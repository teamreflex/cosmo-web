import { fabricateVote } from "@/lib/server/cosmo/gravity";
import { withCosmoApi } from "@/lib/server/cosmo/withCosmoApi";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { fabricateVotePayloadSchema } from "@/lib/universal/cosmo/gravity";

type Params = {
  artist: ValidArtist;
};

/**
 * API route that gets the calldata for a new gravity vote.
 */
export const POST = withCosmoApi<Params>(async ({ req, ctx, user }) => {
  const result = fabricateVotePayloadSchema.safeParse(await req.json());
  if (!result.success) {
    return Response.json({ error: "invalid vote" }, { status: 422 });
  }

  const { artist } = await ctx.params;
  const calldata = await fabricateVote(user.accessToken, artist, result.data);

  return Response.json(calldata);
});
