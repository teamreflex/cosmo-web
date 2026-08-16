import * as metadata from "../effect/metadata.js";
import { runCosmo } from "./runtime.js";

/**
 * Fetch objekt metadata from the v1 API.
 */
export async function fetchMetadataV1(
  tokenId: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(metadata.fetchMetadataV1(tokenId), signal);
}

/**
 * Fetch objekt metadata from the v3 API.
 * Shouldn't be used as it doesn't contain full collection data.
 */
export async function fetchMetadataV3(
  tokenId: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(metadata.fetchMetadataV3(tokenId), signal);
}
