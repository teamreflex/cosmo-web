import * as collection from "../effect/collection";
import type { ValidArtist } from "../types/common";
import { runCosmo } from "./runtime";

type FetchSummariesParams = {
  session: string;
  artistId: ValidArtist;
  className: string;
  signal?: AbortSignal | null;
};

/**
 * Fetch objekt summaries for a given artist and class.
 */
export async function fetchObjektSummaries({
  session,
  artistId,
  className,
  signal = null,
}: FetchSummariesParams) {
  return await runCosmo(
    collection.fetchObjektSummaries({ session, artistId, className }),
    signal,
  );
}
