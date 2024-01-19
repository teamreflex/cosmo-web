import "server-only";
import {
  CosmoPublicUser,
  LoginResult,
  PublicProfile,
} from "@/lib/universal/cosmo/auth";
import { cosmo } from "../http";
import { defaultProfile } from "@/lib/utils";

type CosmoLoginResult = {
  user: {
    id: number;
    email: string;
    nickname: string;
    address: string;
    profileImageUrl: string;
  };
  credentials: {
    accessToken: string;
    refreshToken: string;
  };
};

/**
 * Logs in with Cosmo and returns the access token.
 */
export async function login(
  email: string,
  accessToken: string
): Promise<LoginResult> {
  return await cosmo<CosmoLoginResult>("/auth/v1/signin", {
    method: "POST",
    body: {
      channel: "email",
      email,
      accessToken,
    },
  }).then((res) => ({
    id: res.user.id,
    email: res.user.email,
    nickname: res.user.nickname,
    address: res.user.address,
    accessToken: res.credentials.accessToken,
    refreshToken: res.credentials.refreshToken,
  }));
}

type CosmoUserResult = {
  profile: {
    id: number;
    email: string;
    nickname: string;
    address: string;
    profileImageUrl: string;
    followingArtists: {
      name: string;
      title: string;
      contracts: {
        Como: string;
        Objekt: string;
      };
      assetBalance: {
        totalComo: number;
        totalObjekt: number;
      };
    }[];
  };
};

export type CosmoUser = {
  nickname: string;
  address: string;
  profileImageUrl: string;
  artists: {
    name: string;
    title: string;
    contracts: {
      Como: string;
      Objekt: string;
    };
    assetBalance: {
      totalComo: number;
      totalObjekt: number;
    };
  }[];
};

/**
 * Fetches the user from the access token.
 */
export async function user(accessToken: string): Promise<CosmoUser> {
  return await cosmo<CosmoUserResult>("/user/v1/me", {
    cache: "no-cache",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => ({
    nickname: res.profile.nickname,
    address: res.profile.address,
    profileImageUrl: res.profile.profileImageUrl,
    artists: res.profile.followingArtists,
  }));
}

type CosmoSearchResult = {
  results: {
    nickname: string;
    address: string;
    profileImageUrl: string;
  }[];
};

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
