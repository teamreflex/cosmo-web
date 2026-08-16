import { Effect } from "effect";
import { ObjektSummariesResponseSchema } from "../schema/collection";
import type { ValidArtist } from "../types/common";
import { cosmoClient, decodeBody } from "./http";

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
      .pipe(Effect.flatMap(decodeBody(ObjektSummariesResponseSchema)));
    return response.collections;
  },
);
