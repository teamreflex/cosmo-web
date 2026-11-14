import { $fetchObjektsWithComo } from "@/lib/functions/como";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { buildCalendar } from "@/lib/universal/como";
import { calendarDateSchema } from "@/lib/universal/schema/como";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/user/by-address/$address/como")({
  server: {
    handlers: {
      /**
       * Endpoint for getting the COMO calendar for a given address.
       */
      GET: async ({ request, params }) => {
        if (!(await verifyRequestApiKey(request))) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 },
          );
        }

        const url = new URL(request.url);
        const date = calendarDateSchema.safeParse(
          url.searchParams.get("now") || undefined,
        );
        if (!date.success) {
          return Response.json(
            { error: "validation error", details: date.error.issues },
            { status: 422 },
          );
        }

        const objekts = await $fetchObjektsWithComo({
          data: { address: params.address },
        });
        return Response.json(
          buildCalendar(
            date.data,
            objekts,
            url.searchParams.get("tz") ?? "UTC",
          ),
        );
      },
    },
  },
});
