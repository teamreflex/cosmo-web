import { and, eq, inArray, not, sql } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { Addresses, addr, isEqual } from "@apollo/util";
import { indexer } from "./db/indexer";
import { collections, objekts } from "./db/indexer/schema";
import { remember } from "./cache";
import type { ComoBalance, ObjektWithCollection } from "@/lib/universal/como";
import { $fetchArtists } from "@/lib/server/artists";

/**
 * Fetch incoming transfers for Special & Premier objekts for a given address
 */
export const $fetchObjektsWithComo = createServerFn({ method: "GET" })
  .inputValidator(z.object({ address: z.string() }))
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
        case 
          when ${collections.class} = 'Special' then 1
          when ${collections.class} = 'Premier' then 2
          else 0
        end
      `.mapWith(Number),
      })
      .from(objekts)
      .where(
        and(
          eq(objekts.owner, data.address.toLowerCase()),
          // idntt doesn't have monthly como
          not(eq(collections.artist, "idntt")),
        ),
      )
      .innerJoin(
        collections,
        and(
          eq(objekts.collectionId, collections.id),
          inArray(collections.class, ["Special", "Premier"]),
        ),
      );
  });

/**
 * Fetch ERC20 token balances from the indexer database.
 * Cached for 15 minutes.
 */
export const $fetchTokenBalances = createServerFn({ method: "GET" })
  .inputValidator(z.object({ address: z.string() }))
  .handler(async ({ data }): Promise<ComoBalance[]> => {
    return remember(`como-balances:${data.address}`, 60 * 15, async () => {
      const { artists } = await $fetchArtists();
      const balances = await indexer.query.comoBalances.findMany({
        where: {
          owner: addr(data.address),
        },
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
