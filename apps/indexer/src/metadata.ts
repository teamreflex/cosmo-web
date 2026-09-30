import { runCosmo } from "@apollo/cosmo/runtime";
import {
  fetchMetadataV1,
  fetchMetadataV3,
} from "@apollo/cosmo/server/metadata";
import { normalizeV3 } from "@apollo/cosmo/types/metadata";

/**
 * Fetch objekt metadata (v1).
 */
export async function fetchMetadataWithRetry(tokenId: string) {
  return runCosmo(fetchMetadataV1(tokenId));
}

/**
 * Fetch objekt metadata (v3).
 */
export async function fetchMetadataWithRetryV3(tokenId: string) {
  const metadata = await runCosmo(fetchMetadataV3(tokenId));
  return normalizeV3(metadata, tokenId);
}
