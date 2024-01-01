import { getUser } from "@/app/api/common";
import { fetchArtistGridStatus } from "@/lib/server/cosmo/grid";
import { NextResponse } from "next/server";

/**
 * API route that services the /grid/:grid page.
 * Takes a grid slug and returns the user's status/progress for that grid.
 */
export async function GET(
  _: Request,
  { params }: { params: { grid: string } }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const grid = await fetchArtistGridStatus(auth.user.accessToken, params.grid);
  return NextResponse.json(grid);
}
