import type { ValidArtist } from "../types/common";
import type {
  CosmoByNickname,
  CosmoSearchResult,
  CosmoUserProfile,
} from "../types/user";
import { cosmo } from "./http";

/**
 * Fetch a user from COSMO by nickname.
 */
export async function fetchByNickname(nickname: string) {
  return await cosmo<CosmoByNickname>(`/bff/v3/users/by-nickname/${nickname}`, {
    retry: false,
  });
}

/**
 * Search for the given user.
 */
export async function search(token: string, term: string) {
  return await cosmo<CosmoSearchResult>("/bff/v3/users/search", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      nickname: term,
      skip: 0,
      take: 100,
    },
  });
}

/**
 * Fetch a user's public profile.
 */
export async function fetchUserProfile(
  token: string,
  userId: number,
  artistId: ValidArtist,
) {
  return await cosmo<CosmoUserProfile>(`/bff/v3/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      artistId,
    },
  });
}
