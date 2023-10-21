import { getUser } from "@/app/api/common";
import { ValidArtist, fetchPoll } from "@/lib/server/cosmo";
import { NextResponse } from "next/server";

export const runtime = "edge";

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
