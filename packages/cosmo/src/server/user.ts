import type { ValidArtist } from "../types/common";
import type {
  CosmoByNicknameResult,
  CosmoSearchResult,
  CosmoShopUser,
  CosmoUserProfile,
} from "../types/user";
import { cosmo, cosmoShop } from "./http";

/**
 * Fetch a user from COSMO by nickname.
 */
export async function fetchByNickname(nickname: string) {
  return await cosmo<CosmoByNicknameResult>(
    `/user/v1/by-nickname/${nickname}`,
    {
      retry: false,
    },
  ).then((res: CosmoByNicknameResult) => res.profile);
}

/**
 * Fetch the current user via webshop cookie.
 */
export async function userWebshop(cookie: string) {
  return await cosmoShop<CosmoShopUser>("/bff/v1/users/me", {
    headers: {
      Cookie: `user-session=${cookie}`,
    },
    query: {
      tid: crypto.randomUUID(),
    },
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
