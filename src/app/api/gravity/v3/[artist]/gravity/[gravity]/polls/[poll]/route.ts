import { getUser } from "@/app/api/common";
import { fetchPoll } from "@/lib/server/cosmo/gravity";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { NextResponse } from "next/server";

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
  return NextResponse.json(poll);
}
