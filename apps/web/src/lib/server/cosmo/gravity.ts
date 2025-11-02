import { createServerOnlyFn } from "@tanstack/react-start";
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
export const fetchGravities = createServerOnlyFn(
  async (token: string, artistId: ValidArtist) => {
    return await cosmo<CosmoGravityList>(`/bff/v3/gravities`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      query: {
        artistId,
      },
    });
  },
);

/**
 * Fetch a single gravity.
 */
export const fetchGravity = createServerOnlyFn(
  async (artistId: ValidArtist, gravityId: number) => {
    return await cosmo<{ gravity: CosmoGravity }>(
      `/gravity/v3/${artistId}/gravity/${gravityId}`,
    )
      .then((res) => res.gravity)
      .catch(() => null);
  },
);

/**
 * Fetch the poll fields.
 */
export const fetchPoll = createServerOnlyFn(
  async (
    token: string,
    artist: ValidArtist,
    gravityId: number,
    pollId: number,
  ) => {
    return await cosmo<{ pollDetail: CosmoPollChoices }>(
      `/gravity/v3/${artist}/gravity/${gravityId}/polls/${pollId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ).then((res) => res.pollDetail);
  },
);
