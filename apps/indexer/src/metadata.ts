import {
  fetchMetadataV1,
  fetchMetadataV3,
} from "@apollo/cosmo/server/metadata";
import {
  normalizeV3,
  type CosmoObjektMetadataV1,
} from "@apollo/cosmo/types/metadata";
import { FetchError } from "ofetch";

// v1 carries the real serial (objektNo); v3 fabricates it as 0 as a placeholder
// that the serial-0 backfill repairs once v1 recovers.
export type MetadataResult =
  | { source: "v1"; data: CosmoObjektMetadataV1 }
  | { source: "v3"; data: CosmoObjektMetadataV1 };

/**
 * Fetch objekt metadata preferring v1 (real serial), falling back to v3 when v1
 * is down. A 404 means metadata isn't generated yet and short-circuits without a
 * fallback so the caller drops the row; other failures (including timeouts) retry
 * v1 then fall to v3. Each attempt is bounded by `timeoutMs` so a hung v1 can't
 * pin a whole chunk under the per-chunk concurrent fan-out.
 */
export async function fetchMetadata(
  tokenId: string,
  retries = 2,
  baseDelayMs = 500,
  timeoutMs = 3_000,
): Promise<MetadataResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await fetchMetadataV1(
        tokenId,
        AbortSignal.timeout(timeoutMs),
      );
      return { source: "v1", data };
    } catch (error) {
      // 404 = metadata not generated yet, not an outage; preserve today's drop.
      if (error instanceof FetchError && error.status === 404) {
        throw error;
      }

      // v1 retries exhausted on a non-404 failure: fall back to v3.
      if (attempt >= retries) {
        const metadata = await fetchMetadataV3(
          tokenId,
          AbortSignal.timeout(timeoutMs),
        );
        return { source: "v3", data: normalizeV3(metadata, tokenId) };
      }

      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * 2 ** attempt),
      );
    }
  }
}

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
