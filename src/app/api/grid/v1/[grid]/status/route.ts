import { getUser } from "@/app/api/common";
import { fetchArtistGridStatus } from "@/lib/server/cosmo";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _: Request,
  { params }: { params: { grid: string } }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const grid = await fetchArtistGridStatus(auth.user.cosmoToken, params.grid);
  return NextResponse.json(grid);
}
