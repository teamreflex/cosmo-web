import { fetchArtist, fetchArtists } from "@apollo/cosmo/server/artists";
import { Effect } from "effect";

/**
 * Fetch every artist with full member data. The list endpoint only returns
 * summaries, so each artist is fetched individually for the .id field.
 */
export const fetchAllArtists = Effect.fn("fetchAllArtists")(function* (
  token: string,
) {
  const artistList = yield* fetchArtists(token);
  return yield* Effect.all(
    artistList.map((artist) => fetchArtist(token, artist.name)),
    { concurrency: 5 },
  );
});
