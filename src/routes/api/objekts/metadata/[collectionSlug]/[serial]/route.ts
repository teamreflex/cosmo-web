import { cacheHeaders } from "@/routes/api/common";
import { indexer } from "@/lib/server/db/indexer";
import type { SerialObjekt, SerialTransfer } from "@/lib/universal/objekts";
import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    collectionSlug: string;
    serial: string;
  }>;
};

/**
 * API route for fetching an objekt and its owner by its serial number.
 * Cached for 4 hours.
 */
export async function GET(_: Request, props: Params) {
  const params = await props.params;

  // validate serial
  const serial = parseInt(params.serial);
  if (isNaN(serial)) {
    return Response.json({ message: "Invalid serial" }, { status: 422 });
  }

  // fetch objekt with transfers
  const collection = await indexer.query.collections.findFirst({
    where: { slug: params.collectionSlug },
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
  const knownAddresses = await fetchKnownAddresses(Array.from(addresses));
  const addressMap = new Map(
    knownAddresses.map((acc) => [acc.address.toLowerCase(), acc.username])
  );

  // map usernames to transfers
  const transfers: SerialTransfer[] = objekt.transfers.map((transfer) => ({
    ...transfer,
    fromUsername: addressMap.get(transfer.from.toLowerCase()) ?? null,
    toUsername: addressMap.get(transfer.to.toLowerCase()) ?? null,
  }));

  const result = {
    username: addressMap.get(objekt.owner) ?? null,
    address: objekt.owner,
    serial: objekt.serial,
    transfers,
  } satisfies SerialObjekt;

  return Response.json(
    { result },
    {
      headers: cacheHeaders({ vercel: 60 * 60 * 4 }),
    }
  );
}
