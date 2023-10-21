import { COSMO_ENDPOINT } from "./common";

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

type LoginResult = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  accessToken: string;
  refreshToken: string;
};

/**
 * Logs in with Cosmo and returns the access token.
 * @param email string
 * @param accessToken string
 * @returns Promise<LoginResult>
 */
export async function login(
  email: string,
  accessToken: string
): Promise<LoginResult> {
  const res = await fetch(`${COSMO_ENDPOINT}/auth/v1/signin`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "email",
      email,
      accessToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to login");
  }

  const result: CosmoLoginResult = await res.json();
  return {
    id: result.user.id,
    email: result.user.email,
    nickname: result.user.nickname,
    address: result.user.address,
    accessToken: result.credentials.accessToken,
    refreshToken: result.credentials.refreshToken,
  };
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
 * @param accessToken string
 * @returns Promise<CosmoUser>
 */
export async function user(accessToken: string): Promise<CosmoUser> {
  const res = await fetch(`${COSMO_ENDPOINT}/user/v1/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  const result: CosmoUserResult = await res.json();
  return {
    nickname: result.profile.nickname,
    address: result.profile.address,
    profileImageUrl: result.profile.profileImageUrl,
    artists: result.profile.followingArtists,
  };
}

type CosmoSearchResult = {
  results: {
    nickname: string;
    address: string;
    profileImageUrl: string;
  }[];
};

export type SearchUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
};

/**
 * Search for the given user.
 * @param term string
 * @returns Promise<User[]>
 */
export async function search(term: string): Promise<SearchUser[]> {
  const res = await fetch(`${COSMO_ENDPOINT}/user/v1/search?query=${term}`);

  if (res.ok) {
    const data: CosmoSearchResult = await res.json();
    return data.results;
  }

  return [];
}

type RefreshTokenResult = {
  refreshToken: string;
  accessToken: string;
};

/**
 * Refresh the given token.
 * @param refreshToken string
 * @returns Promise<RefreshTokenResult>
 */
export async function refresh(
  refreshToken: string
): Promise<RefreshTokenResult> {
  const res = await fetch(`${COSMO_ENDPOINT}/auth/v1/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (res.ok) {
    const { credentials }: { credentials: RefreshTokenResult } =
      await res.json();
    return credentials;
  }

  throw new Error("Failed to refresh token");
}
