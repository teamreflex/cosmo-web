import { Effect, Schedule } from "effect";
import { MetadataV1Schema, MetadataV3Schema } from "../schema/metadata";
import { decodeBody, metadataClient } from "./http";

/**
 * Both metadata endpoints retry for minutes rather than seconds: COSMO
 * routinely has no metadata for the first seconds after a mint, and
 * `apps/indexer` cannot skip a token without losing its transfer for good.
 * Backs off 1s, 2s, 4s ... capped at 30s, for up to 5 minutes.
 */
const metadataRetryPolicy = Schedule.min([
  Schedule.exponential("1 second"),
  Schedule.spaced("30 seconds"),
]).pipe(Schedule.upTo({ duration: "5 minutes" }));

/**
 * Bound each attempt so a stalled connection cannot outlive the window, then
 * retry under the shared policy. A decode failure means COSMO changed their
 * response shape, so it surfaces immediately instead of burning the window.
 * Adds `TimeoutError` to the failures a caller can see, and callers driving a
 * UI should pass a request signal so a cancelled request interrupts the retry.
 */
const withMetadataRetry = <A, E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<A, E, R>,
) =>
  effect.pipe(
    Effect.timeout("30 seconds"),
    Effect.retry({
      schedule: metadataRetryPolicy,
      while: (error) => error._tag !== "CosmoDecodeError",
    }),
  );

/**
 * Fetch objekt metadata from the v1 API.
 */
export const fetchMetadataV1 = Effect.fn("Cosmo.fetchMetadataV1")(function* (
  tokenId: string,
) {
  const client = yield* metadataClient;
  return yield* client
    .get(`/objekt/v1/token/${tokenId}`)
    .pipe(Effect.flatMap(decodeBody(MetadataV1Schema)), withMetadataRetry);
});

/**
 * Fetch objekt metadata from the v3 API.
 * Shouldn't be used as it doesn't contain full collection data.
 */
export const fetchMetadataV3 = Effect.fn("Cosmo.fetchMetadataV3")(function* (
  tokenId: string,
) {
  const client = yield* metadataClient;
  return yield* client
    .get(`/bff/v3/objekts/nft-metadata/${tokenId}`)
    .pipe(Effect.flatMap(decodeBody(MetadataV3Schema)), withMetadataRetry);
});
