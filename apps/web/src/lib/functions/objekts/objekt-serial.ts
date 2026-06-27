import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts.server";
import { indexer } from "@/lib/server/db/indexer";
import type { SerialObjekt, SerialTransfer } from "@/lib/universal/objekts";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

/**
 * Fetch a single objekt by collection slug + serial, with its owner and
 * transfer history, resolving known COSMO usernames for each address.
 */
export const $fetchObjektSerial = createServerFn({ method: "GET" })
  .validator(
    z.object({ slug: z.string(), serial: z.number().int().positive() }),
  )
  .handler(async ({ data }): Promise<SerialObjekt | null> => {
    const collection = await indexer.query.collections.findFirst({
      where: { slug: data.slug },
      with: {
        objekts: {
          where: { serial: data.serial },
          with: { transfers: { orderBy: { timestamp: "desc" } } },
          limit: 1,
        },
      },
      columns: { slug: true },
    });

    const objekt = collection?.objekts[0];
    if (!objekt) return null;

    const addresses = new Set<string>([objekt.owner]);
    for (const transfer of objekt.transfers) {
      addresses.add(transfer.from);
      addresses.add(transfer.to);
    }
    const addressMap = await fetchKnownAddresses(Array.from(addresses));

    const transfers: SerialTransfer[] = objekt.transfers.map((transfer) => ({
      ...transfer,
      fromUsername:
        addressMap.get(transfer.from.toLowerCase())?.username ?? null,
      toUsername: addressMap.get(transfer.to.toLowerCase())?.username ?? null,
    }));

    return {
      username: addressMap.get(objekt.owner)?.username ?? null,
      address: objekt.owner,
      serial: objekt.serial,
      transfers,
    } satisfies SerialObjekt;
  });
