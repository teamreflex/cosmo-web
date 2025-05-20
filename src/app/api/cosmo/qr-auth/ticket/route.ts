import { queryTicket } from "@/lib/server/cosmo/qr-auth";
import type { NextRequest } from "next/server";

/**
 * Query the status of a login ticket.
 */
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("ticket");
  if (!param) {
    return Response.json({ error: "ticket not provided" }, { status: 422 });
  }

  try {
    var ticket = await queryTicket(param);
  } catch (err) {
    return Response.json({ error: "error querying ticket" }, { status: 500 });
  }

  return Response.json(ticket);
}
