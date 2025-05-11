import { useQueryClient } from "@tanstack/react-query";
import { GravityHookParams, RevealLog } from "./types";
import { useEffect } from "react";
import { GRAVITY_QUERY_KEYS } from "./queries";

/**
 * Simulate reveals for a gravity poll.
 */
export function useSimulateReveals(
  params: GravityHookParams & { optionCount: number }
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.setQueryData(
      GRAVITY_QUERY_KEYS.REVEALS({
        contract: params.contract,
        pollId: params.pollId,
      }),
      new Map<number, RevealLog>()
    );
  }, [queryClient, params]);

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.setQueryData(
        GRAVITY_QUERY_KEYS.REVEALS({
          contract: params.contract,
          pollId: params.pollId,
        }),
        (prev: Map<number, RevealLog> | undefined) => {
          if (!prev) return prev;

          const next = new Map(prev);

          const maxIndex = prev.size;
          for (let i = 0; i < 25; i++) {
            const currentIndex = maxIndex + i;
            const randomCandidateId = Math.floor(
              Math.random() * params.optionCount
            );
            next.set(currentIndex, {
              pollId: params.pollId,
              voteIndex: BigInt(currentIndex),
              candidateId: BigInt(randomCandidateId),
            });
          }
          return next;
        }
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [queryClient, params]);
}
