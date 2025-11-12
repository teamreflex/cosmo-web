import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { GravityVote } from "@/lib/universal/gravity";
import type { GravityPollDetailsParams } from "@/lib/queries/gravity";
import { baseUrl } from "@/lib/utils";
import { gravityPollDetailsQuery } from "@/lib/queries/gravity";

export type GravityHookParams = {
  tokenId: bigint;
  pollId: bigint;
};

export const gravityVotesKey = (pollId: number) => ["gravity", "votes", pollId];

/**
 * Fetch votes for a given poll.
 */
export function useGravityVotes(pollId: number) {
  return useSuspenseQuery({
    queryKey: gravityVotesKey(pollId),
    queryFn: async ({ signal }) => {
      const url = new URL(`/api/gravity/${pollId}/votes`, baseUrl());
      return await ofetch<GravityVote[]>(url.toString(), {
        signal,
      });
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

/**
 * Fetch a poll and its candidates.
 */
export function useGravityPoll(params: GravityPollDetailsParams) {
  return useSuspenseQuery(gravityPollDetailsQuery(params));
}
