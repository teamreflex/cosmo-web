import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { unstable_cache } from "next/cache";

/**
 * Fetch all unique collections from the index.
 */
export const fetchUniqueCollections = unstable_cache(
  async () => {
    const rows = await indexer
      .selectDistinctOn([collections.collectionNo], {
        collectionNo: collections.collectionNo,
      })
      .from(collections)
      .orderBy(asc(collections.collectionNo));

    return rows.map((row) => row.collectionNo);
  },
  ["unique-collections"],
  {
    revalidate: 60 * 60 * 24, // 24 hours
  }
);
