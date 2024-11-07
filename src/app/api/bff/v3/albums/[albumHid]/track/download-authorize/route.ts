import { getUser } from "@/app/api/common";
import { fetchAlbumDownload } from "@/lib/server/cosmo/albums";
import { NextRequest } from "next/server";

type Params = {
  albumHid: string;
};

/**
 * API route that services OMA download authorization.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<Params> }
) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const { albumHid } = await props.params;

  const tracks = await fetchAlbumDownload(auth.user.accessToken, albumHid);
  return Response.json(tracks);
}
