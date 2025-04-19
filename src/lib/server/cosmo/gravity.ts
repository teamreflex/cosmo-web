import "server-only";
import {
  CosmoGravity,
  CosmoGravityVoteCalldata,
  CosmoMyGravityResult,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
  CosmoUpcomingGravity,
  FabricateVotePayload,
} from "@/lib/universal/cosmo/gravity";
import { ValidArtist } from "@/lib/universal/cosmo/common";
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
 * Fetch the result for the given gravity.
 */
export async function fetchMyGravityResult(
  token: string,
  artist: ValidArtist,
  gravityId: number
) {
  return await cosmo<{ status: CosmoMyGravityResult }>(
    `/gravity/v3/${artist}/gravity/${gravityId}/status`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).then((res) => res.status);
}

/**
 * Fetch the total COMO
 */
export async function fetchComoSpent(token: string, artist: ValidArtist) {
  return await cosmo<{ totalComoUsed: number }>(
    `/gravity/v3/${artist}/status/total`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).then((res) => res.totalComoUsed);
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

/**
 * Get hashed vote data from Cosmo.
 */
export async function fabricateVote(
  token: string,
  artist: ValidArtist,
  payload: FabricateVotePayload
) {
  return await cosmo<CosmoGravityVoteCalldata>(
    `/gravity/v3/${artist}/fabricate-vote`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: payload,
    }
  );
}
