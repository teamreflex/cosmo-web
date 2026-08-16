import { HttpClientResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
import type { ValidArtist } from "../types/common";
import { cosmoClient } from "./http";

const ObjektSummariesResponseSchema = Schema.Struct({
  collectionCount: Schema.Number,
  collections: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        collection: Schema.Struct({
          collectionId: Schema.String,
          artistName: Schema.String,
          frontMedia: Schema.optional(Schema.NullOr(Schema.String)),
          bandImageUrl: Schema.optional(Schema.NullOr(Schema.String)),
        }),
      }),
    ),
  ),
});

type FetchSummariesParams = {
  session: string;
  artistId: ValidArtist;
  className: string;
};

/**
 * Fetch objekt summaries for a given artist and class.
 */
export const fetchObjektSummaries = Effect.fn("Cosmo.fetchObjektSummaries")(
  function* ({ session, artistId, className }: FetchSummariesParams) {
    const client = yield* cosmoClient;
    const response = yield* client
      .get("/bff/v3/objekt-summaries", {
        headers: { cookie: `user-session=${session}` },
        urlParams: {
          artistId,
          "class[]": className,
          order: "newest",
          page: "1",
          size: "30",
        },
      })
      .pipe(
        Effect.flatMap(
          HttpClientResponse.schemaBodyJson(ObjektSummariesResponseSchema),
        ),
        Effect.scoped,
      );
    return response.collections;
  },
);
