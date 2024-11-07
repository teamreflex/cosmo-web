import { getUser } from "@/app/api/common";
import { fetchAlbumByQrCode } from "@/lib/server/cosmo/albums";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  n: z.string(),
});

/**
 * API route that services OMA claiming.
 */
export async function GET(request: NextRequest) {
  const auth = await getUser();
  if (!auth.success) {
    return new Response(auth.error, { status: auth.status });
  }

  const result = schema.safeParse({
    n: request.nextUrl.searchParams.get("n"),
  });
  if (!result.success) {
    return new Response("Invalid code", { status: 400 });
  }

  const album = await fetchAlbumByQrCode(auth.user.accessToken, result.data.n);
  return Response.json(album);
}
