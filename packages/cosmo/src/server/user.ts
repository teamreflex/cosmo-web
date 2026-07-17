import type { ValidArtist } from "../types/common";
import type {
  CosmoByNickname,
  CosmoSearchResult,
  CosmoUserProfile,
} from "../types/user";
import { decrypt, EncryptionError } from "./encryption";
import { cosmo } from "./http";

/**
 * Fetch a user from COSMO by nickname.
 */
export async function fetchByNickname(
  nickname: string,
  signal: AbortSignal | null = null,
) {
  return await cosmo<CosmoByNickname>(`/bff/v3/users/by-nickname/${nickname}`, {
    retry: false,
    signal,
  });
}

/**
 * Search for the given user.
 */
export async function search(
  token: string,
  term: string,
  signal: AbortSignal | null = null,
) {
  return await cosmo<CosmoSearchResult>("/bff/v3/users/search", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      nickname: term,
      skip: 0,
      take: 100,
    },
    signal,
  });
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
  return await cosmo<CosmoUserProfile>(`/bff/v3/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      artistId,
    },
    signal,
    parseResponse: (text) => {
      try {
        var plaintext = decrypt(text, key);
      } catch (err) {
        throw new EncryptionError("Error decrypting payload", { cause: err });
      }

      return JSON.parse(plaintext) satisfies CosmoUserProfile;
    },
  });
}
