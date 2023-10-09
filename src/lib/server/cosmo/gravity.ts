import {
  COSMO_ENDPOINT,
  CosmoGravity,
  CosmoMyGravityResult,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoUpcomingGravity,
  ValidArtist,
} from ".";

export type CosmoGravityList = {
  upcoming: CosmoUpcomingGravity[];
  ongoing: CosmoOngoingGravity[];
  past: CosmoPastGravity[];
};

/**
 * Fetch the list of gravities for the given artist.
 * @param token string
 * @param artist ValidArtist
 * @returns Promise<CosmoGravityList>
 */
export async function fetchGravities(token: string, artist: ValidArtist) {
  const res = await fetch(`${COSMO_ENDPOINT}/gravity/v3/${artist}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch gravity list");
  }

  const result: CosmoGravityList = await res.json();
  return result;
}

/**
 * Fetch a single gravity.
 * @param token string
 * @param artist ValidArtist
 * @param gravityId number
 * @returns Promise<CosmoGravity>
 */
export async function fetchGravity(
  token: string,
  artist: ValidArtist,
  gravityId: number
) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/gravity/v3/${artist}/gravity/${gravityId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch gravity");
  }

  const { gravity }: { gravity: CosmoGravity } = await res.json();
  return gravity;
}

export type CosmoMyGravityResultResponse = {
  status: CosmoMyGravityResult;
};

/**
 * Fetch the result for the given gravity.
 * @param token string
 * @param artist ValidArtist
 * @param gravityId number
 * @returns Promise<CosmoGravityList>
 */
export async function fetchMyGravityResult(
  token: string,
  artist: ValidArtist,
  gravityId: number
) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/gravity/v3/${artist}/gravity/${gravityId}/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch my gravity result");
  }

  const { status }: CosmoMyGravityResultResponse = await res.json();
  return status;
}

export type CosmoGravityComoSpentResult = {
  totalComoUsed: number;
};

/**
 * Fetch the total COMO
 * @param token string
 * @param artist ValidArtist
 * @returns Promise<number>
 */
export async function fetchComoSpent(token: string, artist: ValidArtist) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/gravity/v3/${artist}/status/total`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch total como spent");
  }

  const { totalComoUsed }: CosmoGravityComoSpentResult = await res.json();
  return totalComoUsed;
}
