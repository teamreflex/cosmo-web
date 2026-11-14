import { Effect } from "effect";
import {
  CosmoArtistListSchema,
  CosmoArtistWithMembersBFFSchema,
} from "../schema/artists";
import { type ValidArtist, validArtists } from "../types/common";
import { bearer, cosmoClient, decodeBody } from "./http";

/**
 * Fetch the artists within COSMO that the app knows. One it doesn't know yet
 * is left out with a warning, so a new artist never fails the whole list.
 */
export const fetchArtists = Effect.fn("Cosmo.fetchArtists")(function* (
  token: string,
) {
  const client = yield* cosmoClient;
  const listed = yield* client
    .get("/bff/v3/artists", { headers: bearer(token) })
    .pipe(Effect.flatMap(decodeBody(CosmoArtistListSchema)));

  const known = [];
  for (const artist of listed) {
    const name = validArtists.find((valid) => valid === artist.name);
    if (name === undefined) {
      yield* Effect.logWarning(`COSMO lists an unknown artist: ${artist.name}`);
      continue;
    }
    known.push({ ...artist, name });
  }
  return known;
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

/**
 * Fetch every artist with full member data. The list endpoint only returns
 * summaries, so each artist is fetched individually for the .id field.
 */
export const fetchAllArtists = Effect.fn("Cosmo.fetchAllArtists")(function* (
  token: string,
) {
  const artistList = yield* fetchArtists(token);
  return yield* Effect.all(
    artistList.map((artist) => fetchArtist(token, artist.name)),
    { concurrency: 5 },
  );
});
