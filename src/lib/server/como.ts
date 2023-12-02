import { and, eq, sql } from "drizzle-orm";
import { indexer } from "./db/indexer";
import { collections, objekts } from "./db/indexer/schema";
import { ObjektWithCollection } from "@/lib/universal/como";

const statement = indexer
  .select({
    objekt: objekts,
    collection: collections,
  })
  .from(objekts)
  .where(eq(objekts.owner, sql.placeholder("address")))
  .innerJoin(
    collections,
    and(
      eq(objekts.collectionId, collections.id),
      eq(collections.class, "Special")
    )
  )
  .prepare("como-transfers");

/**
 * Fetch incoming transfers for Special objekts for a given address
 */
export async function fetchSpecialObjekts(
  address: string
): Promise<ObjektWithCollection[]> {
  const addr = address.toLowerCase();
  return await statement.execute({ address: addr });
}
