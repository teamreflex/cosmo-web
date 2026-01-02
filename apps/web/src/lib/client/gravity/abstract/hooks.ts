import { $fetchRevealedVotes } from "@/lib/server/gravity";
import { baseUrl } from "@/lib/utils";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { isAfter } from "date-fns";
import { ofetch } from "ofetch";
import { useEffect, useMemo, useState } from "react";
import type { RevealedVote } from "../types";
import type {
  AggregatedGravityData,
  AggregatedTopUser,
  AggregatedTopVote,
  LiveStatus,
  UseChainData,
  UseChainDataOptions,
  UseChainDataSuccess,
} from "./types";

// polling intervals in ms
const DATE_POLLING_INTERVAL = 2500;
const REVEAL_POLLING_INTERVAL = 10_000;

/**
 * Get the current date and updates with the polling interval.
 */
export function useCurrentDate() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
    }, DATE_POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return date;
}

/**
 * Fetch aggregated gravity data from the backend.
 */
export function useAggregatedGravityData(pollId: number) {
  return useSuspenseQuery({
    queryKey: ["gravity", "aggregated", pollId],
    queryFn: async ({ signal }) => {
      const url = new URL(`/api/gravity/${pollId}/aggregated`, baseUrl());
      return await ofetch<AggregatedGravityData>(url.toString(), {
        signal,
      });
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

/**
 * Fetch and derive vote data from the backend.
 * Polls for reveals during the "live" phase.
 */
export function useChainData(params: UseChainDataOptions): UseChainData {
  const pollId = Number(params.pollId);
  const { data: aggregated } = useAggregatedGravityData(pollId);

  // determine initial live status based on aggregated data
  const initialLiveStatus = useMemo((): LiveStatus => {
    if (isAfter(new Date(params.endDate), params.now)) {
      return "voting";
    }
    // use server-provided revealed count to determine status
    const unrevealed = aggregated.totalVoteCount - aggregated.revealedVoteCount;
    return unrevealed === 0 ? "finalized" : "live";
  }, [
    aggregated.totalVoteCount,
    aggregated.revealedVoteCount,
    params.endDate,
    params.now,
  ]);

  // poll for reveals during "live" phase using infinite query for accumulation
  const { data, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["gravity", "reveals", pollId],
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      $fetchRevealedVotes({
        data: { pollId, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: initialLiveStatus === "live",
  });

  // manual polling interval
  useEffect(() => {
    if (initialLiveStatus !== "live") return;

    const interval = setInterval(() => {
      if (!isFetchingNextPage) {
        void fetchNextPage();
      }
    }, REVEAL_POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [initialLiveStatus, fetchNextPage, isFetchingNextPage]);

  // flatten all pages into a single array of reveals
  const reveals = useMemo(() => {
    return data?.pages.flatMap((page) => page.votes) ?? [];
  }, [data]);

  // create a map for O(1) reveal lookups
  const revealMap = useMemo(() => {
    return new Map(reveals.map((r) => [r.id, r.candidateId]));
  }, [reveals]);

  // apply reveals to top votes
  const topVotesWithReveals = useMemo((): AggregatedTopVote[] => {
    if (reveals.length === 0) {
      return aggregated.topVotes;
    }
    return aggregated.topVotes.map((vote) => ({
      ...vote,
      candidateId: revealMap.get(vote.id) ?? vote.candidateId,
    }));
  }, [aggregated.topVotes, revealMap, reveals.length]);

  // apply reveals to top users
  const topUsersWithReveals = useMemo((): AggregatedTopUser[] => {
    if (reveals.length === 0) {
      return aggregated.topUsers;
    }
    return aggregated.topUsers.map((user) => ({
      ...user,
      votes: user.votes.map((v) => ({
        ...v,
        candidateId: revealMap.get(v.id) ?? v.candidateId,
      })),
    }));
  }, [aggregated.topUsers, revealMap, reveals.length]);

  // derive revealed votes list from top votes (for VoterBreakdown)
  const revealedVotes = useMemo((): RevealedVote[] => {
    return topVotesWithReveals
      .filter((v) => v.candidateId !== null)
      .map((vote) => ({
        voter: vote.voter,
        comoAmount: vote.comoAmount,
        candidateId: vote.candidateId!,
        blockNumber: vote.blockNumber,
        username: vote.username,
        pollId: 0,
        hash: vote.id,
      }));
  }, [topVotesWithReveals]);

  // use server-provided comoPerCandidate (computed from all revealed votes)
  const comoPerCandidate = aggregated.comoPerCandidate;

  // use server-provided revealed count for remaining calculation
  const remainingVotesCount =
    aggregated.totalVoteCount - aggregated.revealedVoteCount;

  // Derive final live status
  const liveStatus = useMemo((): LiveStatus => {
    if (isAfter(new Date(params.endDate), params.now)) {
      return "voting";
    }
    return remainingVotesCount === 0 ? "finalized" : "live";
  }, [params.endDate, params.now, remainingVotesCount]);

  return {
    status: "success",
    liveStatus,
    isRefreshing: isFetchingNextPage,
    totalVotesCount: aggregated.totalVoteCount,
    remainingVotesCount,
    comoPerCandidate,
    revealedVotes,
    // New fields for components that use aggregated data directly
    chartData: aggregated.chartData,
    topVotes: topVotesWithReveals,
    topUsers: topUsersWithReveals,
  } satisfies UseChainDataSuccess;
}
