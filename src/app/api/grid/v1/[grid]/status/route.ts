import { getUser } from "@/app/api/common";
import { fetchArtistGridStatus } from "@/lib/server/cosmo/grid";

/**
 * API route that services the /grid/:grid page.
 * Takes a grid slug and returns the user's status/progress for that grid.
 */
export async function GET(_: Request, props: { params: Promise<{ grid: string }> }) {
  const params = await props.params;
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const grid = await fetchArtistGridStatus(auth.user.accessToken, params.grid);
  return Response.json(grid);
}
