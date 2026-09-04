import { Effect } from "effect";
import { ObjektSummariesResponseSchema } from "../schema/collection";
import type { ValidArtist } from "../types/common";
import { cosmoClient, decodeBody } from "./http";

type FetchSummariesParams = {
  session: string;
  artistId: ValidArtist;
  className: string;
  seasons?: string[];
};

/**
 * Fetch objekt summaries for a given artist and class, optionally narrowed
 * to specific seasons. Only the newest 30 collections are returned, so the
 * season filter matters for large classes like Double.
 */
export const fetchObjektSummaries = Effect.fn("Cosmo.fetchObjektSummaries")(
  function* ({ session, artistId, className, seasons }: FetchSummariesParams) {
    const client = yield* cosmoClient;
    const response = yield* client
      .get("/bff/v3/objekt-summaries", {
        headers: { cookie: `user-session=${session}` },
        urlParams: {
          artistId,
          "class[]": className,
          "season[]": seasons,
          order: "newest",
          page: "1",
          size: "30",
        },
      })
      .pipe(Effect.flatMap(decodeBody(ObjektSummariesResponseSchema)));
    return response.collections;
  },
);
