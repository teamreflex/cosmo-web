import { getUser } from "@/app/api/common";
import { fetchPoll } from "@/lib/server/cosmo/gravity";
import { ValidArtist } from "@/lib/universal/cosmo/common";

/**
 * API route that services the /gravity/:artist/:gravity page.
 * Fetches the poll options for the given gravity.
 */
export async function GET(
  _: Request,
  { params }: { params: { artist: ValidArtist; gravity: number; poll: number } }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const poll = await fetchPoll(
    auth.user.accessToken,
    params.artist,
    params.gravity,
    params.poll
  );

  return Response.json(poll);
}
