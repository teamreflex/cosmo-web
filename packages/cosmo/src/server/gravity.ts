import * as gravity from "../effect/gravity";
import type { ValidArtist } from "../types/common";
import { runCosmo } from "./runtime";

/**
 * Fetch the list of gravities for the given artist.
 */
export async function fetchGravities(
  token: string,
  artistId: ValidArtist,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(gravity.fetchGravities(token, artistId), signal);
}

/**
 * Fetch a single gravity.
 */
export async function fetchGravity(
  token: string,
  gravityId: number,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(gravity.fetchGravity(token, gravityId), signal).catch(
    () => null,
  );
}

/**
 * Fetch the poll fields.
 */
export async function fetchPoll(
  token: string,
  pollId: number,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(gravity.fetchPoll(token, pollId), signal);
}
