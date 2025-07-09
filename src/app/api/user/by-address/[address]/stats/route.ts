import { env } from "@/env";
import { getArtistStatsByAddress } from "@/lib/server/progress";

type Props = {
  params: Promise<{
    address: string;
  }>;
};

/**
 * Endpoint for getting stats about objekts owned by an address
 */
export async function GET(req: Request, props: Props) {
  const authKey = req.headers.get("Authorization");
  if (authKey !== env.AUTH_KEY) {
    return Response.json({ error: "invalid authorization" }, { status: 401 });
  }

  const { address } = await props.params;
  const stats = await getArtistStatsByAddress(address);

  return Response.json(stats);
}
