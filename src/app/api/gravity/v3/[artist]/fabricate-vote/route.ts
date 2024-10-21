import { getUser } from "@/app/api/common";
import { fabricateVote } from "@/lib/server/cosmo/gravity";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { fabricateVotePayloadSchema } from "@/lib/universal/cosmo/gravity";

/**
 * API route that gets the calldata for a new gravity vote.
 */
export async function POST(
  req: Request,
  props: {
    params: Promise<{
      artist: ValidArtist;
    }>;
  }
) {
  const params = await props.params;
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const result = fabricateVotePayloadSchema.safeParse(await req.json());
  if (!result.success) {
    return Response.json({ error: "invalid vote" }, { status: 422 });
  }

  const calldata = await fabricateVote(
    auth.user.accessToken,
    params.artist,
    result.data
  );

  return Response.json(calldata);
}
