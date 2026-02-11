import { fetchMetadataV1 } from "@apollo/cosmo/server/metadata";

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
