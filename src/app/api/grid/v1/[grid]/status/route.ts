import { getAuth } from "@/app/api/common";
import { fetchArtistGridStatus } from "@/lib/server/cosmo/grid";

/**
 * API route that services the /grid/:grid page.
 * Takes a grid slug and returns the user's status/progress for that grid.
 */
export async function GET(
  _: Request,
  { params }: { params: { grid: string } }
) {
  const auth = await getAuth();
  if (auth.status === "invalid") {
    return new Response("unauthorized", { status: 401 });
  }

  const grid = await fetchArtistGridStatus(auth.user.accessToken, params.grid);
  return Response.json(grid);
}
