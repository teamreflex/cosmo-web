import {
  fetchMetadataV1,
  fetchMetadataV3,
} from "@apollo/cosmo/server/metadata";
import {
  normalizeV3,
  type CosmoObjektMetadataV1,
} from "@apollo/cosmo/types/metadata";
import type { Store } from "@subsquid/typeorm-store";
import { FetchError } from "ofetch";
import type { ProcessorContext } from "./processor";

type Log = ProcessorContext<Store>["log"];

export type MetadataSource = "v1" | "v3";

// ok carries usable metadata (v3 fabricates serial 0 for the backfill to fix).
// skip is a 404 we must never persist; fatal means both APIs are unusable, so
// the caller crashes to let subsquid retry the batch rather than drop a mint.
export type MetadataResult =
  | { outcome: "ok"; source: MetadataSource; data: CosmoObjektMetadataV1 }
  | { outcome: "skip" }
  | { outcome: "fatal"; cause: unknown };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// v1 circuit breaker: once v1 fails for real, serve v3 placeholders instead of
// paying the retry budget on every mint, and probe v1 occasionally to recover.
// module scoped so it persists across batches in the long-lived processor.
const V1_PROBE_INTERVAL_MS = 5 * 60_000;
let v1Down = false;
let v1NextProbeAt = 0; // epoch ms; when an open breaker next allows a probe

// let a single caller probe per interval; synchronous so a concurrent chunk can't all probe at once.
function claimV1Probe() {
  if (Date.now() < v1NextProbeAt) return false;
  v1NextProbeAt = Date.now() + V1_PROBE_INTERVAL_MS;
  return true;
}

/**
 * Fetch objekt metadata, preferring v1 (real serial) and falling back to v3 when
 * v1 is down. Each attempt is bounded by `timeoutMs`.
 */
export async function fetchMetadata(
  tokenId: string,
  log: Log,
  retries = 2,
  baseDelayMs = 500,
  timeoutMs = 3_000,
): Promise<MetadataResult> {
  // with the breaker open, only the probe carrier retries v1.
  const probing = v1Down && claimV1Probe();
  if (probing) {
    log.info("COSMO v1 down; probing for recovery");
  }

  if (!v1Down || probing) {
    for (let attempt = 0; ; attempt++) {
      try {
        const data = await fetchMetadataV1(
          tokenId,
          AbortSignal.timeout(timeoutMs),
        );
        if (v1Down) {
          v1Down = false;
          v1NextProbeAt = 0;
          log.info("COSMO v1 recovered; resuming v1-primary metadata fetch");
        }
        return { outcome: "ok", source: "v1", data };
      } catch (error) {
        // a 404 means v1 is up, so it never trips the breaker.
        if (error instanceof FetchError && error.status === 404) {
          return { outcome: "skip" };
        }
        // a probe gets one shot; a healthy breaker spends its retries first.
        if (probing || attempt >= retries) {
          if (!v1Down) {
            v1Down = true;
            v1NextProbeAt = Date.now() + V1_PROBE_INTERVAL_MS;
            log.warn("COSMO v1 down; falling back to v3 until it recovers");
          } else if (probing) {
            log.warn("COSMO v1 still down; staying on v3");
          }
          break;
        }
        await sleep(baseDelayMs * 2 ** attempt);
      }
    }
  }

  // v1 unavailable: fall back to v3 with its own retries.
  for (let attempt = 0; ; attempt++) {
    try {
      const metadata = await fetchMetadataV3(
        tokenId,
        AbortSignal.timeout(timeoutMs),
      );
      // a normalize failure is a deterministic bad payload → fatal, not retryable.
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
