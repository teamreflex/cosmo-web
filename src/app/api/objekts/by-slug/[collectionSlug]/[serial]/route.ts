import { cacheHeaders } from "@/app/api/common";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import type { SerialObjekt } from "@/lib/universal/objekts";

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
  const objekt = await indexer.query.objekts.findFirst({
    where: { serial },
    with: {
      collection: {
        where: { slug: params.collectionSlug },
        columns: {
          slug: true,
        },
      },
      transfers: true,
    },
    columns: {
      owner: true,
      serial: true,
    },
  });

  if (!objekt) {
    return Response.json({ message: "Objekt not found" }, { status: 404 });
  }

  // fetch owner profile
  const profile = await db.query.cosmoAccounts.findFirst({
    where: {
      address: objekt.owner,
    },
    columns: {
      username: true,
    },
  });

  const result = {
    username: profile?.username ?? null,
    address: objekt.owner,
    serial: objekt.serial,
    transfers: objekt.transfers,
  } satisfies SerialObjekt;

  return Response.json(result, {
    headers: cacheHeaders({ vercel: 60 * 60 * 4 }),
  });
}
