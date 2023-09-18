const COSMO_ENDPOINT = "https://api.cosmo.fans";

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
  cosmoToken: string;
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
    cosmoToken: result.credentials.accessToken,
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
