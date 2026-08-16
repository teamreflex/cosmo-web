import * as user from "../effect/user";
import type { ValidArtist } from "../types/common";
import { runCosmo } from "./runtime";

/**
 * Fetch a user from COSMO by nickname.
 */
export async function fetchByNickname(
  nickname: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(user.fetchByNickname(nickname), signal);
}

/**
 * Search for the given user.
 */
export async function search(
  token: string,
  term: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(user.search(token, term), signal);
}

/**
 * Fetch a user's public profile.
 */
export async function fetchUserProfile(
  token: string,
  key: string,
  userId: number,
  artistId: ValidArtist,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(
    user.fetchUserProfile(token, key, userId, artistId),
    signal,
  );
}
