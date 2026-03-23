import {
  fetchMetadataV1,
  fetchMetadataV3,
} from "@apollo/cosmo/server/metadata";
import { normalizeV3 } from "@apollo/cosmo/types/metadata";

/**
 * Fetch objekt metadata with exponential backoff.
 * The COSMO API can be temporarily unavailable for newly minted tokens,
 * so retry until the deadline rather than silently skipping.
 */
export async function fetchMetadataWithRetry(
  tokenId: string,
  deadlineMs = 30_000,
) {
  const deadline = Date.now() + deadlineMs;
  let delay = 1_000;
  while (true) {
    try {
      return await fetchMetadataV1(tokenId);
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/**
 * Fetch objekt metadata (v3) with exponential backoff.
 * The COSMO API can be temporarily unavailable for newly minted tokens,
 * so retry until the deadline rather than silently skipping.
 */
export async function fetchMetadataWithRetryV3(
  tokenId: string,
  deadlineMs = 30_000,
) {
  const deadline = Date.now() + deadlineMs;
  let delay = 1_000;
  while (true) {
    try {
      const metadata = await fetchMetadataV3(tokenId);
      return normalizeV3(metadata, tokenId);
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
