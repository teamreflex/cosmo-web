import { HttpClientResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
import { metadataClient } from "./http.js";

const MetadataV1Schema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  image: Schema.String,
  background_color: Schema.String,
  objekt: Schema.Struct({
    collectionId: Schema.String,
    season: Schema.String,
    member: Schema.String,
    collectionNo: Schema.String,
    class: Schema.String,
    artists: Schema.mutable(Schema.Array(Schema.String)),
    thumbnailImage: Schema.String,
    frontImage: Schema.String,
    backImage: Schema.String,
    accentColor: Schema.String,
    backgroundColor: Schema.String,
    textColor: Schema.String,
    comoAmount: Schema.Number,
    tokenId: Schema.String,
    objektNo: Schema.Number,
    tokenAddress: Schema.String,
    transferable: Schema.Boolean,
  }),
});

const MetadataV3Schema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  image: Schema.String,
  background_color: Schema.String,
  attributes: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        trait_type: Schema.String,
        value: Schema.String,
      }),
    ),
  ),
});

/**
 * Fetch objekt metadata from the v1 API.
 */
export const fetchMetadataV1 = Effect.fn("Cosmo.fetchMetadataV1")(function* (
  tokenId: string,
) {
  const client = yield* metadataClient;
  return yield* client
    .get(`/objekt/v1/token/${tokenId}`)
    .pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(MetadataV1Schema)),
      Effect.scoped,
    );
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
    .pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(MetadataV3Schema)),
      Effect.scoped,
    );
});
