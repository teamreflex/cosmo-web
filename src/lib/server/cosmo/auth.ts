import { LoginResult, SearchUser } from "@/lib/universal/cosmo/auth";
import "server-only";
import { cosmo } from "../http";

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
export async function search(term: string): Promise<SearchUser[]> {
  return await cosmo<CosmoSearchResult>("/user/v1/search", {
    query: {
      query: term,
    },
  }).then((res) =>
    res.results.map((user) => ({
      ...user,
      isAddress: false,
    }))
  );
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
  return await cosmo<RefreshTokenResult>("/auth/v1/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}
