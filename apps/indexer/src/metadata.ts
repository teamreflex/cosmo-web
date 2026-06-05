import {
  fetchMetadataV1,
  fetchMetadataV3,
} from "@apollo/cosmo/server/metadata";
import {
  normalizeV3,
  type CosmoObjektMetadataV1,
} from "@apollo/cosmo/types/metadata";
import { FetchError } from "ofetch";

export type MetadataSource = "v1" | "v3";

// `ok` carries usable metadata: v1 has the real serial, v3 fabricates it as 0 (a
// placeholder the backfill repairs). `skip` is a 404 — a burned/deleted or
// not-yet-generated token we must never persist. `fatal` means both APIs are
// unusable (down, or an unparseable v3 payload); the caller crashes so subsquid
// retries the batch rather than silently dropping a mint.
export type MetadataResult =
  | { outcome: "ok"; source: MetadataSource; data: CosmoObjektMetadataV1 }
  | { outcome: "skip" }
  | { outcome: "fatal"; cause: unknown };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch objekt metadata preferring v1 (real serial), falling back to v3 when v1
 * is down. A 404 is a skip the caller must never persist; both APIs being
 * unusable is fatal so the caller can crash and let subsquid retry the batch
 * rather than drop data. Each attempt is bounded by `timeoutMs` so a hung API
 * can't pin a whole chunk under the per-chunk concurrent fan-out.
 */
export async function fetchMetadata(
  tokenId: string,
  retries = 2,
  baseDelayMs = 500,
  timeoutMs = 3_000,
): Promise<MetadataResult> {
  // v1 first; a 404 means the token is burned/deleted or not yet generated.
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await fetchMetadataV1(
        tokenId,
        AbortSignal.timeout(timeoutMs),
      );
      return { outcome: "ok", source: "v1", data };
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        return { outcome: "skip" };
      }
      if (attempt >= retries) break;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  // v1 is unreachable: fall back to v3 with its own bounded retries.
  for (let attempt = 0; ; attempt++) {
    try {
      const metadata = await fetchMetadataV3(
        tokenId,
        AbortSignal.timeout(timeoutMs),
      );
      // v3 answered; a normalize failure is a deterministic bad payload, not a
      // transient outage, so it's fatal rather than retryable.
      try {
        return {
          outcome: "ok",
          source: "v3",
          data: normalizeV3(metadata, tokenId),
        };
      } catch (cause) {
        return { outcome: "fatal", cause };
      }
    } catch (error) {
      // both APIs unusable after retries → fatal: crash to retry the batch.
      if (attempt >= retries) {
        return { outcome: "fatal", cause: error };
      }
      await sleep(baseDelayMs * 2 ** attempt);
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
