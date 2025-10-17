import "server-only";
import type {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
  CosmoUpcomingGravity,
} from "@/lib/universal/cosmo/gravity";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { cosmo } from "../http";

type CosmoGravityList = {
  upcoming: CosmoUpcomingGravity[];
  ongoing: CosmoOngoingGravity[];
  past: CosmoPastGravity[];
};

/**
 * Fetch the list of gravities for the given artist.
 * Not cached due to COMO updates.
 */
export async function fetchGravities(artistId: ValidArtist) {
  return await cosmo<CosmoGravityList>(`/bff/v3/gravities`, {
    query: {
      artistId,
    },
  });
}

/**
 * Fetch a single gravity.
 */
export async function fetchGravity(gravityId: number) {
  return await cosmo<{ gravity: CosmoGravity }>(
    `/bff/v3/gravities/${gravityId}`
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
