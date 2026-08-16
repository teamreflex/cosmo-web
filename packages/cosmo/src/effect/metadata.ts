import { Effect } from "effect";
import { MetadataV1Schema, MetadataV3Schema } from "../schema/metadata.js";
import { decodeBody, metadataClient } from "./http.js";

/**
 * Fetch objekt metadata from the v1 API.
 */
export const fetchMetadataV1 = Effect.fn("Cosmo.fetchMetadataV1")(function* (
  tokenId: string,
) {
  const client = yield* metadataClient;
  return yield* client
    .get(`/objekt/v1/token/${tokenId}`)
    .pipe(Effect.flatMap(decodeBody(MetadataV1Schema)), Effect.scoped);
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
    .pipe(Effect.flatMap(decodeBody(MetadataV3Schema)), Effect.scoped);
});
