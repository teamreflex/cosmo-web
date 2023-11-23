import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";

/**
 * Fetch all unique collections from the index.
 */
export async function fetchUniqueCollections() {
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
}
