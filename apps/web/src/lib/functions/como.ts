import { remember } from "@/lib/server/cache.server";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import type { ComoBalance, ObjektWithCollection } from "@/lib/universal/como";
import { Addresses, addr, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, not, sql } from "drizzle-orm";
import * as z from "zod";
import { $fetchArtists } from "./artists";

/**
 * Fetch Special & Premier objekts for a given address.
 */
export const $fetchObjektsWithComo = createServerFn({ method: "GET" })
  .validator(z.object({ address: z.string() }))
  .handler(async ({ data }): Promise<ObjektWithCollection[]> => {
    // spin account doesn't accumulate como
    if (isEqual(data.address, Addresses.SPIN)) {
      return [];
    }

    return await indexer
      .select({
        artistId: collections.artist,
        mintedAt: objekts.mintedAt,
        amount: sql<number>`
          case when ${collections.class} = 'Special' then 1 else 2 end
        `.mapWith(Number),
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(
        and(
          eq(objekts.owner, data.address.toLowerCase()),
          inArray(collections.class, ["Special", "Premier"]),
          not(eq(collections.artist, "idntt")),
        ),
      )
      .comment({ fn: "fetchObjektsWithComo" });
  });

/**
 * Fetch ERC20 token balances from the indexer database.
 * Cached for 15 minutes.
 */
export const $fetchTokenBalances = createServerFn({ method: "GET" })
  .validator(z.object({ address: z.string() }))
  .handler(async ({ data }): Promise<ComoBalance[]> => {
    const owner = addr(data.address);

    return remember(`como-balances:${owner}`, 60 * 15, async () => {
      const { artists } = await $fetchArtists();
      const balances = await indexer.query.comoBalances.findMany({
        where: { owner },
      });

      return Object.values(artists).map((artist) => {
        const balance = balances.find((b) => b.tokenId === artist.comoTokenId);

        return {
          id: artist.id,
          owner: data.address,
          amount: balance ? balance.amount : 0,
        };
      });
    });
  });
