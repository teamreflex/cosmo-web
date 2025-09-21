import { createServerFileRoute } from "@tanstack/react-start/server";
import { queryTicket } from "@/lib/server/cosmo/qr-auth";

export const ServerRoute = createServerFileRoute(
  "/api/cosmo/qr-auth/ticket"
).methods({
  /**
   * Query the status of a login ticket.
   */
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const param = url.searchParams.get("ticket");
    if (!param) {
      return Response.json({ error: "ticket not provided" }, { status: 422 });
    }

    try {
      var ticket = await queryTicket(param);
    } catch (err) {
      return Response.json({ error: "error querying ticket" }, { status: 500 });
    }

    return Response.json(ticket);
  },
});
