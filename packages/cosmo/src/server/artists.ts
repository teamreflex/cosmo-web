import { Effect } from "effect";
import {
  CosmoArtistListSchema,
  CosmoArtistWithMembersBFFSchema,
} from "../schema/artists";
import type { ValidArtist } from "../types/common";
import { bearer, cosmoClient, decodeBody } from "./http";

/**
 * Fetch artists within COSMO.
 */
export const fetchArtists = Effect.fn("Cosmo.fetchArtists")(function* (
  token: string,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get("/bff/v3/artists", { headers: bearer(token) })
    .pipe(Effect.flatMap(decodeBody(CosmoArtistListSchema)));
});

/**
 * Fetch a single artist and its members.
 */
export const fetchArtist = Effect.fn("Cosmo.fetchArtist")(function* (
  token: string,
  artistId: ValidArtist,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get(`/bff/v3/artists/${artistId}`, { headers: bearer(token) })
    .pipe(Effect.flatMap(decodeBody(CosmoArtistWithMembersBFFSchema)));
});
