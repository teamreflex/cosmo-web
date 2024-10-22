import "server-only";
import {
  CosmoPublicUser,
  CosmoSearchResult,
  CosmoUser,
  CosmoUserResult,
  LoginChannel,
  LoginResult,
} from "@/lib/universal/cosmo/auth";
import { cosmo } from "../http";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type CosmoLoginResult = {
  user: {
    id: number;
    email: string;
    nickname: string;
    address: string;
    profileImageUrl: string;
    loginChannel: LoginChannel;
    socialLoginUserId: string;
    isBanned: boolean;
    lastViewedArtist: ValidArtist;
  };
  profile: CosmoUser;
  credentials: {
    accessToken: string;
    refreshToken: string;
  };
};

/**
 * Logs in with COSMO and returns the access token.
 */
export async function login(email: string, accessToken: string) {
  return await cosmo<CosmoLoginResult>("/auth/v1/signin", {
    method: "POST",
    body: {
      channel: "email",
      email,
      accessToken,
    },
  });
}

/**
 * Fetches the user from the access token.
 */
export async function user(accessToken: string) {
  return await cosmo<CosmoUserResult>("/user/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => res.profile);
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

/**
 * Fetch a user by nickname.
 */
export async function fetchByNickname(
  token: string,
  nickname: string
): Promise<CosmoPublicUser | undefined> {
  return await cosmo<{ profile: CosmoPublicUser }>(
    `/user/v1/by-nickname/${nickname}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
    .then((res) => res.profile)
    .catch(() => undefined);
}
