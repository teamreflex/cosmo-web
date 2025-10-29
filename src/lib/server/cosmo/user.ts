import { createServerOnlyFn } from "@tanstack/react-start";
import { cosmo } from "../http";
import { cosmoShopHeaders } from "./qr-auth";
import type {
  CosmoByNicknameResult,
  CosmoSearchResult,
  CosmoShopUser,
} from "@/lib/universal/cosmo/user";

/**
 * Fetch a user from COSMO by nickname.
 */
export const fetchByNickname = createServerOnlyFn(async (nickname: string) => {
  return await cosmo<CosmoByNicknameResult>(
    `/user/v1/by-nickname/${nickname}`,
    {
      retry: false,
    },
  ).then((res) => res.profile);
});

/**
 * Fetch the current user via webshop cookie.
 */
export const user = createServerOnlyFn(async (cookie: string) => {
  return await cosmo<CosmoShopUser>("/bff/v1/users/me", {
    baseURL: "https://shop.cosmo.fans",
    headers: {
      ...cosmoShopHeaders,
      Cookie: `user-session=${cookie}`,
    },
    query: {
      tid: crypto.randomUUID(),
    },
  });
});

/**
 * Search for the given user.
 */
export const search = createServerOnlyFn(
  async (token: string, term: string) => {
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
  },
);
