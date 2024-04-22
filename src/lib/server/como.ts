import { and, eq } from "drizzle-orm";
import { indexer } from "./db/indexer";
import { collections, objekts } from "./db/indexer/schema";
import { ObjektWithCollection } from "@/lib/universal/como";

/**
 * Fetch incoming transfers for Special objekts for a given address
 */
export async function fetchSpecialObjekts(
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
        eq(collections.class, "Special")
      )
    );
}
