import type { ValidArtist } from "../types/common";
import type {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
  CosmoUpcomingGravity,
} from "../types/gravity";
import { cosmo } from "./http";

type CosmoGravityList = {
  upcoming: CosmoUpcomingGravity[];
  ongoing: CosmoOngoingGravity[];
  past: CosmoPastGravity[];
};

/**
 * Fetch the list of gravities for the given artist.
 */
export async function fetchGravities(
  token: string,
  artistId: ValidArtist,
  signal?: AbortSignal,
) {
  return await cosmo<CosmoGravityList>(`/bff/v3/gravities`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      artistId,
    },
    signal,
  });
}

/**
 * Fetch a single gravity.
 */
export async function fetchGravity(
  token: string,
  gravityId: number,
  signal?: AbortSignal,
) {
  return await cosmo<{ gravity: CosmoGravity }>(
    `/bff/v3/gravities/${gravityId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  )
    .then((res: { gravity: CosmoGravity }) => res.gravity)
    .catch(() => null);
}

/**
 * Fetch the poll fields.
 */
export async function fetchPoll(
  token: string,
  pollId: number,
  signal?: AbortSignal,
) {
  return await cosmo<{ pollDetail: CosmoPollChoices }>(
    `/bff/v3/polls/${pollId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  ).then((res: { pollDetail: CosmoPollChoices }) => res.pollDetail);
}
