import { subsquidStatus } from "@apollo/database/indexer/schema";
import { indexer } from "./db/indexer";

/**
 * Fetch the current block height from the indexer.
 */
export async function fetchProcessorHeight() {
  const [result] = await indexer.select().from(subsquidStatus).limit(1);
  return result?.height ?? 0;
}
