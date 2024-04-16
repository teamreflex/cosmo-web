import { db } from "@/lib/server/db";
import * as neonSchema from "@/lib/server/db/schema";
import { indexer } from "@/lib/server/db/indexer";
import * as indexerSchema from "@/lib/server/db/indexer/schema";
import { notInArray } from "drizzle-orm";

/**
 * Detect which objekts are missing metadata.
 */

const metadata = await db
  .select({
    collectionId: neonSchema.objektMetadata.collectionId,
  })
  .from(neonSchema.objektMetadata);

const missing = await indexer
  .select({
    slug: indexerSchema.collections.slug,
  })
  .from(indexerSchema.collections)
  .where(
    notInArray(
      indexerSchema.collections.slug,
      metadata.map((m) => m.collectionId)
    )
  );

console.log(`${missing.length} missing`);

for (const m of missing) {
  console.log(m.slug);
}
