import { and, eq, inArray, sql } from "drizzle-orm";
import { indexer } from "./db/indexer";
import { collections, objekts } from "./db/indexer/schema";
import type { ComoBalance, ObjektWithCollection } from "@/lib/universal/como";
import { unstable_cache } from "next/cache";
import { addr } from "../utils";
import { getArtistsWithMembers } from "@/data-fetching";

/**
 * Fetch incoming transfers for Special & Premier objekts for a given address
 */
export async function fetchObjektsWithComo(
  address: string
): Promise<ObjektWithCollection[]> {
  const addr = address.toLowerCase();

  return await indexer
    .select({
      contract: collections.contract,
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
    .where(eq(objekts.owner, addr))
    .innerJoin(
      collections,
      and(
        eq(objekts.collectionId, collections.id),
        inArray(collections.class, ["Special", "Premier"])
      )
    );
}

// const ERC20_DECIMALS = 18;

/**
 * Fetch ERC20 token balances from Alchemy.
 * Cached for 15 minutes.
 */
export const fetchTokenBalances = unstable_cache(
  async (address: string): Promise<ComoBalance[]> => {
    const artists = getArtistsWithMembers();
    const balances = await indexer.query.comoBalances.findMany({
      where: {
        owner: addr(address),
      },
    });

    return artists.map((artist) => {
      const balance = balances.find(
        (balance) => balance.tokenId === artist.comoTokenId
      );

      return {
        id: artist.id,
        owner: address,
        amount: balance ? balance.amount : 0,
      };
    });
  },
  ["como-balances"],
  {
    revalidate: 60 * 15, // 15 minutes
  }
);
