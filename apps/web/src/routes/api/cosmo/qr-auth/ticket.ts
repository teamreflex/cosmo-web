import { createFileRoute } from "@tanstack/react-router";
import { queryTicket } from "@apollo/cosmo/server/qr-auth";

export const Route = createFileRoute("/api/cosmo/qr-auth/ticket")({
  server: {
    handlers: {
      /**
       * Query the status of a login ticket.
       */
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const param = url.searchParams.get("ticket");
        if (!param) {
          return Response.json(
            { error: "ticket not provided" },
            { status: 422 },
          );
        }

        try {
          var ticket = await queryTicket(param);
        } catch (err) {
          console.error("[queryTicket] error:", err);
          return Response.json(
            { error: "error querying ticket" },
            { status: 500 },
          );
        }

        return Response.json(ticket);
      },
    },
  },
});
