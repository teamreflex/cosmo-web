import type { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { indexer } from "../db/indexer";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { Collection, Objekt } from "../db/indexer/schema";
import { db } from "../db";
import { cosmoAccounts, pins } from "../db/schema";
import { desc, eq } from "drizzle-orm";
import { remember } from "../cache";

interface ObjektWithCollection extends Objekt {
  collection: Collection;
}

/**
 * Fetch all pins for the given user.
 * Cached for 1 day.
 */
export async function fetchPins(username: string): Promise<CosmoObjekt[]> {
  const tag = `pins:${username.toLowerCase()}`;
  const ttl = 60 * 60 * 24; // 1 day

  return await remember(tag, ttl, async () => {
    const rows = await db
      .select({ tokenId: pins.tokenId })
      .from(pins)
      .innerJoin(cosmoAccounts, eq(pins.address, cosmoAccounts.address))
      .where(eq(cosmoAccounts.username, username))
      .orderBy(desc(pins.id));

    if (rows.length === 0) return [];

    const tokenIds = rows.map((row) => row.tokenId);
    try {
      var results = await indexer.query.objekts.findMany({
        where: {
          id: {
            in: tokenIds,
          },
        },
        with: {
          collection: true,
        },
      });
    } catch (err) {
      return [];
    }

    const mapped = results.map(normalizePin);

    // sort by pin order
    return mapped.sort((a, b) => {
      const indexA = tokenIds.findIndex((item) => item === Number(a.tokenId));
      const indexB = tokenIds.findIndex((item) => item === Number(b.tokenId));
      return indexA - indexB;
    });
  });
}

/**
 * Normalize an objekt with collection into an owned objekt.
 */
export function normalizePin(objekt: ObjektWithCollection): CosmoObjekt {
  return {
    ...objekt.collection,
    status: "minted",
    transferablebyDefault: true,
    tokenAddress: objekt.collection.contract,
    transferable: objekt.transferable,
    usedForGrid: false,
    lenticularPairTokenId: null,
    mintedAt: objekt.mintedAt,
    receivedAt: objekt.receivedAt,
    tokenId: objekt.id.toString(),
    objektNo: objekt.serial,
    artists: [objekt.collection.artist] as ValidArtist[],
  };
}
