import * as artists from "../effect/artists";
import type { ValidArtist } from "../types/common";
import { runCosmo } from "./runtime";

/**
 * Fetch artists within COSMO.
 */
export async function fetchArtists(
  token: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(artists.fetchArtists(token), signal);
}

/**
 * Fetch a single artist and its members.
 */
export async function fetchArtist(
  token: string,
  artistId: ValidArtist,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(artists.fetchArtist(token, artistId), signal);
}
