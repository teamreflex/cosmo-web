import { $fetchObjektsWithComo } from "@/lib/functions/como";
import { $fetchArtistStatsByAddress } from "@/lib/functions/progress";
import { verifyRequestApiKey } from "@/lib/server/api-key.server";
import { db } from "@/lib/server/db";
import { buildCalendar } from "@/lib/universal/como";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/user/by-address/$address/")({
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
        const now = url.searchParams.get("now");
        const tz = url.searchParams.get("tz") ?? "UTC";

        // one query per pool at a time: the web account beside the indexer calendar
        const [account, calendar] = await Promise.all([
          getCosmoAccount(params.address),
          getCalendar(params.address, now, tz),
        ]);
        return Response.json({
          account,
          calendar,
          stats: await $fetchArtistStatsByAddress({
            data: { address: params.address },
          }),
        });
      },
    },
  },
});

/**
 * Get the cosmo account for a given Abstract address.
 */
async function getCosmoAccount(address: string) {
  return await db.query.cosmoAccounts.findFirst({
    where: { address },
    columns: {
      id: false,
      userId: false,
      cosmoId: false,
    },
  });
}

/**
 * Get the COMO calendar for a given address.
 */
async function getCalendar(address: string, now: string | null, tz: string) {
  // parse unix timestamp (supports both seconds and milliseconds)
  const timestamp = now ? parseInt(now) : new Date().getTime();
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);

  const result = await $fetchObjektsWithComo({
    data: { address },
  });
  return buildCalendar(date, result, tz);
}
