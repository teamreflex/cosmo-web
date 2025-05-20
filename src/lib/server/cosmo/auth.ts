import type {
  CosmoByNicknameResult,
  CosmoSearchResult,
} from "@/lib/universal/cosmo/auth";
import { cosmo } from "../http";

/**
 * Fetch a user from COSMO by nickname.
 */
export async function fetchByNickname(nickname: string) {
  return await cosmo<CosmoByNicknameResult>(
    `/user/v1/by-nickname/${nickname}`,
    {
      retry: false,
    }
  ).then((res) => res.profile);
}

/**
 * Search for the given user.
 */
export async function search(token: string, term: string) {
  return await cosmo<CosmoSearchResult>("/user/v1/search", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      query: term,
    },
  });
}

type RefreshTokenResult = {
  refreshToken: string;
  accessToken: string;
};

/**
 * Refresh the given token.
 */
export async function refresh(
  refreshToken: string
): Promise<RefreshTokenResult> {
  return await cosmo<{ credentials: RefreshTokenResult }>("/auth/v1/refresh", {
    method: "POST",
    body: { refreshToken },
  }).then((res) => res.credentials);
}
