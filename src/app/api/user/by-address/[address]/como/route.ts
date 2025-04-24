import { env } from "@/env";
import { fetchObjektsWithComo } from "@/lib/server/como";
import { buildCalendar } from "@/lib/universal/como";
import { NextRequest } from "next/server";

type Props = {
  params: Promise<{
    address: string;
  }>;
};

/**
 * Endpoint for getting the COMO calendar for a given address.
 */
export async function GET(req: NextRequest, props: Props) {
  const authKey = req.headers.get("Authorization");
  if (authKey !== env.AUTH_KEY) {
    return Response.json({ error: "invalid authorization" }, { status: 401 });
  }

  const { address } = await props.params;
  const now = req.nextUrl.searchParams.get("now");

  // parse unix timestamp (supports both seconds and milliseconds)
  const timestamp = now ? parseInt(now) : new Date().getTime();
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);

  const objekts = await fetchObjektsWithComo(address);
  const calendar = buildCalendar(date, objekts);

  return Response.json(calendar);
}
