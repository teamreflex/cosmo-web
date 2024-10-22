import { and, eq, inArray } from "drizzle-orm";
import { indexer } from "./db/indexer";
import { collections, ComoBalance, objekts } from "./db/indexer/schema";
import { ObjektWithCollection } from "@/lib/universal/como";
import { unstable_cache } from "next/cache";

/**
 * Fetch incoming transfers for Special & Premier objekts for a given address
 */
export async function fetchObjektsWithComo(
  address: string
): Promise<ObjektWithCollection[]> {
  const addr = address.toLowerCase();

  return await indexer
    .select({
      objekt: objekts,
      collection: collections,
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

const POLYGON_DECIMALS = 18;

/**
 * Fetch ERC20 token balances from the indexer.
 * Cached for 15 minutes.
 */
export const fetchTokenBalances = unstable_cache(
  async (address: string): Promise<ComoBalance[]> => {
    const balances = await indexer.query.comoBalances.findMany({
      where: (balances, { eq }) => eq(balances.owner, address.toLowerCase()),
    });

    return balances.map((b) => ({
      ...b,
      amount: Math.floor(b.amount / 10 ** POLYGON_DECIMALS),
    }));
  },
  ["token-balances"],
  {
    revalidate: 60 * 15, // 15 minutes
  }
);
