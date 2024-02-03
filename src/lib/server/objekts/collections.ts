import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { unstable_cache } from "next/cache";

/**
 * Fetch all unique collections from the index.
 * Cached for 1 hour.
 */
export const fetchUniqueCollections = unstable_cache(
  async () => {
    try {
      const rows = await indexer
        .selectDistinctOn([collections.collectionNo], {
          collectionNo: collections.collectionNo,
        })
        .from(collections)
        .orderBy(asc(collections.collectionNo));

      return rows.map((row) => row.collectionNo);
    } catch (err) {
      return [];
    }
  },
  ["unique-collections"],
  {
    revalidate: 60 * 60,
    tags: ["objekt-index", "unique-collections"],
  }
);
