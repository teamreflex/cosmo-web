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
import { redirect } from "next/navigation";

type CosmoGravityList = {
  upcoming: CosmoUpcomingGravity[];
  ongoing: CosmoOngoingGravity[];
  past: CosmoPastGravity[];
};

/**
 * Fetch the list of gravities for the given artist.
 * Cached for 15 minutes.
 */
export async function fetchGravities(artist: ValidArtist) {
  return await cosmo<CosmoGravityList>(`/gravity/v3/${artist}`, {
    next: {
      tags: ["gravity"],
      revalidate: 60 * 15, // 15 minutes
    },
  });
}

/**
 * Fetch a single gravity.
 * Cached for 15 minutes.
 */
export async function fetchGravity(artist: ValidArtist, gravityId: number) {
  return await cosmo<{ gravity: CosmoGravity }>(
    `/gravity/v3/${artist}/gravity/${gravityId}`,
    {
      next: {
        tags: ["gravity", artist, gravityId.toString()],
        revalidate: 60 * 15, // 15 minutes
      },
    }
  )
    .then((res) => res.gravity)
    .catch((_) => redirect("/gravity"));
}

type CosmoMyGravityResultResponse = {
  status: CosmoMyGravityResult;
};

/**
 * Fetch the result for the given gravity.
 */
export async function fetchMyGravityResult(
  token: string,
  artist: ValidArtist,
  gravityId: number
) {
  return await cosmo<CosmoMyGravityResultResponse>(
    `/gravity/v3/${artist}/gravity/${gravityId}/status`,
    {
      cache: "no-cache",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).then((res) => res.status);
}

type CosmoGravityComoSpentResult = {
  totalComoUsed: number;
};

/**
 * Fetch the total COMO
 */
export async function fetchComoSpent(token: string, artist: ValidArtist) {
  return await cosmo<CosmoGravityComoSpentResult>(
    `/gravity/v3/${artist}/status/total`,
    {
      cache: "no-cache",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  ).then((res) => res.totalComoUsed);
}

type CosmoPollDetail = {
  pollDetail: CosmoPollChoices;
};

/**
 * Fetch the poll fields.
 */
export async function fetchPoll(
  token: string,
  artist: ValidArtist,
  gravityId: number,
  pollId: number
) {
  return await cosmo<CosmoPollDetail>(
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
