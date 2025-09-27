import { and, eq, inArray, sql } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { queryOptions } from "@tanstack/react-query";
import { addr } from "../utils";
import { indexer } from "./db/indexer";
import { collections, objekts } from "./db/indexer/schema";
import { remember } from "./cache";
import type { ComoBalance, ObjektWithCollection } from "@/lib/universal/como";
import { fetchArtists } from "@/lib/queries/core";

/**
 * Fetch incoming transfers for Special & Premier objekts for a given address
 */
export const fetchObjektsWithComo = createServerFn({ method: "GET" })
  .inputValidator(z.object({ address: z.string() }))
  .handler(async ({ data }): Promise<ObjektWithCollection[]> => {
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
      .where(eq(objekts.owner, data.address.toLowerCase()))
      .innerJoin(
        collections,
        and(
          eq(objekts.collectionId, collections.id),
          inArray(collections.class, ["Special", "Premier"]),
        ),
      );
  });

export const fetchObjektsWithComoQuery = (address: string) =>
  queryOptions({
    queryKey: ["como-calendar", address],
    queryFn: () => fetchObjektsWithComo({ data: { address } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

/**
 * Fetch ERC20 token balances from Alchemy.
 * Cached for 15 minutes.
 */
const fetchTokenBalances = createServerFn({ method: "GET" })
  .inputValidator(z.object({ address: z.string() }))
  .handler(async ({ data }): Promise<ComoBalance[]> => {
    return remember(`como-balances:${data.address}`, 60 * 15, async () => {
      const artists = await fetchArtists();
      const balances = await indexer.query.comoBalances.findMany({
        where: {
          owner: addr(data.address),
        },
      });

      return artists.map((artist) => {
        const balance = balances.find((b) => b.tokenId === artist.comoTokenId);

        return {
          id: artist.id,
          owner: data.address,
          amount: balance ? balance.amount : 0,
        };
      });
    });
  });

export const tokenBalancesQuery = (address: string) =>
  queryOptions({
    queryKey: ["como-balances", address],
    queryFn: () => fetchTokenBalances({ data: { address } }),
    refetchOnWindowFocus: false,
  });
