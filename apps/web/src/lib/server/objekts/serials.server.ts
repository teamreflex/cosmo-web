import { indexer } from "@/lib/server/db/indexer";
import { objekts } from "@/lib/server/db/indexer/schema";
import { inArray } from "drizzle-orm";

/**
 * Fetch serials from the indexer for the given token IDs.
 */
export async function fetchSerials(tokenIds: string[]) {
  if (tokenIds.length === 0) {
    return new Map<string, number>();
  }

  const result = await indexer
    .select({ id: objekts.id, serial: objekts.serial })
    .from(objekts)
    .where(inArray(objekts.id, tokenIds));

  return new Map(result.map((o) => [o.id, o.serial]));
}
