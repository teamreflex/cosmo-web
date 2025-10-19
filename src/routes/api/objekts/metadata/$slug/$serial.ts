import { createFileRoute } from "@tanstack/react-router";
import type { SerialObjekt, SerialTransfer } from "@/lib/universal/objekts";
import { cacheHeaders } from "@/lib/server/cache";
import { indexer } from "@/lib/server/db/indexer";
import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts";

export const Route = createFileRoute("/api/objekts/metadata/$slug/$serial")({
  server: {
    handlers: {
      /**
       * API route for fetching an objekt and its owner by its serial number.
       * Cached for 4 hours.
       */
      GET: async ({ params }) => {
        // validate serial
        const serial = parseInt(params.serial);
        if (isNaN(serial)) {
          return Response.json({ message: "Invalid serial" }, { status: 422 });
        }

        // fetch objekt with transfers
        const collection = await indexer.query.collections.findFirst({
          where: { slug: params.slug },
          with: {
            objekts: {
              where: { serial },
              with: {
                transfers: {
                  orderBy: {
                    timestamp: "desc",
                  },
                },
              },
              limit: 1,
            },
          },
          columns: {
            slug: true,
          },
        });

        if (!collection) {
          return Response.json({ result: null });
        }

        const objekt = collection.objekts[0];
        if (!objekt) {
          return Response.json({ result: null });
        }

        // collect all unique addresses from transfers and owner
        const addresses = new Set<string>();
        addresses.add(objekt.owner);
        for (const transfer of objekt.transfers) {
          addresses.add(transfer.from);
          addresses.add(transfer.to);
        }

        // fetch usernames for all addresses
        const addressMap = await fetchKnownAddresses(Array.from(addresses));

        // map usernames to transfers
        const transfers: SerialTransfer[] = objekt.transfers.map(
          (transfer) => ({
            ...transfer,
            fromUsername:
              addressMap.get(transfer.from.toLowerCase())?.username ?? null,
            toUsername:
              addressMap.get(transfer.to.toLowerCase())?.username ?? null,
          }),
        );

        const result = {
          username: addressMap.get(objekt.owner)?.username ?? null,
          address: objekt.owner,
          serial: objekt.serial,
          transfers,
        } satisfies SerialObjekt;

        return Response.json(
          { result },
          {
            headers: cacheHeaders({ vercel: 60 * 60 * 4 }),
          },
        );
      },
    },
  },
});
