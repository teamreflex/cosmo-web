import { cosmo } from "../http";
import type {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
  CosmoUpcomingGravity,
} from "@/lib/universal/cosmo/gravity";
import type { ValidArtist } from "@/lib/universal/cosmo/common";

type CosmoGravityList = {
  upcoming: CosmoUpcomingGravity[];
  ongoing: CosmoOngoingGravity[];
  past: CosmoPastGravity[];
};

/**
 * Fetch the list of gravities for the given artist.
 * Not cached due to COMO updates.
 */
export async function fetchGravities(artist: ValidArtist) {
  return await cosmo<CosmoGravityList>(`/gravity/v3/${artist}`);
}

/**
 * Fetch a single gravity.
 */
export async function fetchGravity(artist: ValidArtist, gravityId: number) {
  return await cosmo<{ gravity: CosmoGravity }>(
    `/gravity/v3/${artist}/gravity/${gravityId}`
  )
    .then((res) => res.gravity)
    .catch(() => null);
}

/**
 * Fetch the poll fields.
 */
export async function fetchPoll(
  token: string,
  artist: ValidArtist,
  gravityId: number,
  pollId: number
) {
  return await cosmo<{ pollDetail: CosmoPollChoices }>(
    `/gravity/v3/${artist}/gravity/${gravityId}/polls/${pollId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).then((res) => res.pollDetail);
}
