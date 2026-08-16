import { Schema } from "effect";

export const ObjektSummarySchema = Schema.Struct({
  collection: Schema.Struct({
    collectionId: Schema.String,
    artistName: Schema.String,
    frontMedia: Schema.optional(Schema.NullOr(Schema.String)),
    bandImageUrl: Schema.optional(Schema.NullOr(Schema.String)),
  }),
});

export const ObjektSummariesResponseSchema = Schema.Struct({
  collectionCount: Schema.Number,
  collections: Schema.mutable(Schema.Array(ObjektSummarySchema)),
});
