import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { objekts } from "../db/indexer/schema";

/**
 * Fetch all unique collections from the index.
 */
export async function fetchUniqueCollections() {
  try {
    const rows = await indexer
      .selectDistinctOn([objekts.collectionNo], {
        collectionNo: objekts.collectionNo,
      })
      .from(objekts)
      .orderBy(asc(objekts.collectionNo));

    return rows.map((row) => row.collectionNo);
  } catch (err) {
    return [];
  }
}
