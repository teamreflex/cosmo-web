import { remember } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import { pinCacheKey } from "@/lib/server/objekts/pins.server";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { cosmoAccounts, pins } from "@apollo/database/web/schema";
import { isAddress } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import * as z from "zod";

interface ObjektWithCollection extends Objekt {
  collection: Collection;
}

/**
 * Fetch all pins for the given user.
 * Cached for 1 day.
 */
export const $fetchPins = createServerFn({ method: "GET" })
  .inputValidator(z.object({ username: z.string() }))
  .handler(async ({ data }): Promise<CosmoObjekt[]> => {
    const tag = pinCacheKey(data.username);
    const ttl = 60 * 60 * 24; // 1 day

    return await remember(tag, ttl, async () => {
      const column = isAddress(data.username)
        ? cosmoAccounts.address
        : cosmoAccounts.username;

      const rows = await db
        .select({ tokenId: pins.tokenId })
        .from(pins)
        .innerJoin(cosmoAccounts, eq(pins.address, cosmoAccounts.address))
        // decoding username from URL
        .where(eq(column, decodeURIComponent(data.username)))
        .orderBy(desc(pins.id));

      if (rows.length === 0) return [];

      const tokenIds = rows.map((row) => row.tokenId.toString());
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
      const tokenIdIndexMap = new Map(tokenIds.map((id, index) => [id, index]));

      // sort by pin order
      return mapped.sort((a, b) => {
        const indexA = tokenIdIndexMap.get(a.tokenId) ?? Infinity;
        const indexB = tokenIdIndexMap.get(b.tokenId) ?? Infinity;
        return indexA - indexB;
      });
    });
  });

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
    bandImageUrl: objekt.collection.bandImageUrl,
    artists: [objekt.collection.artist] as ValidArtist[],
  };
}
