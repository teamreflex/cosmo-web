import { queryTicket } from "@/lib/server/cosmo/qr-auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Use Playwright to get the reCAPTCHA token, then exchange it for a login ticket.
 */
export async function GET(req: NextRequest) {
  const ticketString = req.nextUrl.searchParams.get("ticket");
  if (ticketString === null) {
    return Response.json({ error: "ticket not provided" }, { status: 400 });
  }

  try {
    var ticket = await queryTicket(ticketString);
  } catch (err) {
    return Response.json({ error: "error querying ticket" }, { status: 500 });
  }

  return Response.json(ticket);
}
