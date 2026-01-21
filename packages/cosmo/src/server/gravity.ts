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
export async function fetchGravities(token: string, artistId: ValidArtist) {
  return await cosmo<CosmoGravityList>(`/bff/v3/gravities`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      artistId,
    },
  });
}

/**
 * Fetch a single gravity.
 */
export async function fetchGravity(token: string, gravityId: number) {
  return await cosmo<{ gravity: CosmoGravity }>(
    `/bff/v3/gravities/${gravityId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  artist: ValidArtist,
  gravityId: number,
  pollId: number,
) {
  return await cosmo<{ pollDetail: CosmoPollChoices }>(
    `/gravity/v3/${artist}/gravity/${gravityId}/polls/${pollId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  ).then((res: { pollDetail: CosmoPollChoices }) => res.pollDetail);
}
