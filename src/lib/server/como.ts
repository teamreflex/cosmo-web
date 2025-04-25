import { and, eq, inArray, sql } from "drizzle-orm";
import { indexer } from "./db/indexer";
import { collections, objekts } from "./db/indexer/schema";
import { ComoBalance, ObjektWithCollection } from "@/lib/universal/como";
import { unstable_cache } from "next/cache";
import { alchemyHTTP } from "./http";
import { Addresses } from "../utils";
import { env } from "@/env";
import { getArtistsWithMembers } from "@/app/data-fetching";

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

export const ERC20_DECIMALS = 18;

/**
 * Fetch ERC20 token balances from Alchemy.
 * Cached for 15 minutes.
 */
export const fetchTokenBalances = unstable_cache(
  async (address: string): Promise<ComoBalance[]> => {
    const artists = getArtistsWithMembers();
    const response = await alchemyHTTP<GetNFTsForOwnerResponse>(
      `/nft/v3/${env.NEXT_PUBLIC_ALCHEMY_KEY}/getNFTsForOwner`,
      {
        method: "GET",
        query: {
          owner: address,
          "contractAddresses[]": Addresses.COMO,
          withMetadata: false,
          pageSize: 10,
        },
      }
    );

    return artists.map((artist) => {
      const balance = response.ownedNfts.find(
        (nft) => nft.tokenId === artist.comoTokenId.toString()
      );

      return {
        id: artist.id,
        owner: address,
        amount: balance ? Number(balance.balance) : 0,
      };
    });
  },
  ["token-balances"],
  {
    revalidate: 60 * 15, // 15 minutes
  }
);

type GetNFTsForOwnerResponse = {
  ownedNfts: {
    contractAddress: string;
    tokenId: string;
    balance: string;
  }[];
  totalCount: number;
  validAt: {
    blockNumber: number;
    blockHash: string;
    blockTimestamp: string;
  };
  pageKey: null;
};
