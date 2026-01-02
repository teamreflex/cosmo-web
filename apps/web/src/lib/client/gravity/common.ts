import type { GravityPollDetailsParams } from "@/lib/queries/gravity";
import { gravityPollDetailsQuery } from "@/lib/queries/gravity";
import { useSuspenseQuery } from "@tanstack/react-query";

export type GravityHookParams = {
  tokenId: bigint;
  pollId: bigint;
};

/**
 * Fetch a poll and its candidates.
 */
export function useGravityPoll(params: GravityPollDetailsParams) {
  return useSuspenseQuery(gravityPollDetailsQuery(params));
}
