import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { CosmoPollChoices } from "@/lib/universal/cosmo/gravity";
import type { GravityVote } from "@/lib/universal/gravity";
import { baseUrl } from "@/lib/utils";

export type GravityHookParams = {
  tokenId: bigint;
  pollId: bigint;
};

export const pollDetailsKey = (params: GravityHookParams) => [
  "gravity",
  "details",
  { tokenId: Number(params.tokenId) },
  Number(params.pollId),
];

export const gravityVotesKey = (pollId: number) => ["gravity", "votes", pollId];

/**
 * Fetch votes for a given poll.
 */
export function useGravityVotes(pollId: number) {
  return useSuspenseQuery({
    queryKey: gravityVotesKey(pollId),
    queryFn: async () => {
      const url = new URL(`/api/gravity/${pollId}/votes`, baseUrl());
      return await ofetch<GravityVote[]>(url.toString());
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

type UseGravityPollParams = {
  artistName: string;
  tokenId: bigint;
  gravityId: number;
  pollId: number;
};

/**
 * Fetch a poll and its candidates.
 */
export function useGravityPoll(params: UseGravityPollParams) {
  return useSuspenseQuery({
    queryKey: pollDetailsKey({
      tokenId: params.tokenId,
      pollId: BigInt(params.pollId),
    }),
    queryFn: async () => {
      const url = new URL(
        `/api/gravity/v3/${params.artistName}/gravity/${params.gravityId}/polls/${params.pollId}`,
        baseUrl()
      );
      return await ofetch<CosmoPollChoices>(url.toString());
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}
