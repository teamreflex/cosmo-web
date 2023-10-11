import {
  COSMO_ENDPOINT,
  CosmoGravity,
  CosmoGravityVoteCalldata,
  CosmoMyGravityResult,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
  CosmoUpcomingGravity,
  FabricateVotePayload,
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
 * @returns Promise<CosmoGravity | undefined>
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
    return undefined;
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

export type CosmoPollDetail = {
  pollDetail: CosmoPollChoices;
};

/**
 * Fetch the poll fields.
 * @param token string
 * @param artist ValidArtist
 * @param gravityId number
 * @param pollId number
 * @returns Promise<CosmoPollDetail>
 */
export async function fetchPoll(
  token: string,
  artist: ValidArtist,
  gravityId: number,
  pollId: number
) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/gravity/v3/${artist}/gravity/${gravityId}/polls/${pollId}`,
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
    throw new Error(
      `Failed to fetch poll "${pollId}" for gravity "${gravityId}"`
    );
  }

  const { pollDetail }: CosmoPollDetail = await res.json();
  return pollDetail;
}

/**
 * Get hashed vote data from Cosmo.
 * @param token string
 * @param artist ValidArtist
 * @param payload FabricateVotePayload
 * @returns Promise<CosmoGravityVoteCalldata>
 */
export async function fabricateVote(
  token: string,
  artist: ValidArtist,
  payload: FabricateVotePayload
) {
  const res = await fetch(
    `${COSMO_ENDPOINT}/gravity/v3/${artist}/fabricate-vote`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to create vote for poll "${payload.pollId}" for gravity "${artist}"`
    );
  }

  const { callData }: { callData: CosmoGravityVoteCalldata } = await res.json();
  return callData;
}
