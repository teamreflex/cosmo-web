import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import z from "zod";
import { indexer } from "../db/indexer";
import { db } from "../db";
import { cosmoAccounts, pins } from "../db/schema";
import { remember } from "../cache";
import type { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { Collection, Objekt } from "../db/indexer/schema";

interface ObjektWithCollection extends Objekt {
  collection: Collection;
}

/**
 * Fetch all pins for the given user.
 * Cached for 1 day.
 */
export const fetchPins = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ username: z.string() }).parse(data))
  .handler(async ({ data }): Promise<CosmoObjekt[]> => {
    const tag = pinCacheKey(data.username);
    const ttl = 60 * 60 * 24; // 1 day

    return await remember(tag, ttl, async () => {
      const rows = await db
        .select({ tokenId: pins.tokenId })
        .from(pins)
        .innerJoin(cosmoAccounts, eq(pins.address, cosmoAccounts.address))
        // decoding username from URL
        .where(eq(cosmoAccounts.username, decodeURIComponent(data.username)))
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

/**
 * Get the cache key for the pins of a user.
 * Hashing the decoded username to avoid CJK characters.
 */
export const pinCacheKey = createServerOnlyFn((username: string) => {
  const hash = createHash("md5")
    .update(decodeURIComponent(username.toLowerCase()))
    .digest("hex");
  return `pins:${hash}`;
});
