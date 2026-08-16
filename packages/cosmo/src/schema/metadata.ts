import { Schema } from "effect";

export const MetadataV1Schema = Schema.Struct({
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

export const MetadataV3Schema = Schema.Struct({
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
