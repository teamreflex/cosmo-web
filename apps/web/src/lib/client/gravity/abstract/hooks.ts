import {
  type GravityPollDetailsParams,
  gravityPollDetailsQuery,
  gravityVoteDataQuery,
} from "@/lib/queries/gravity";
import { $fetchRevealedVotes } from "@/lib/server/gravity";
import { useInfiniteQuery, useSuspenseQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { RevealedVote } from "../types";
import type {
  AggregatedTopUser,
  AggregatedTopVote,
  LiveStatus,
  Reveal,
  UseRevealsOptions,
  UseRevealsResult,
} from "./types";

const REVEAL_POLLING_INTERVAL = 10_000;

/**
 * Fetch poll details and vote data in parallel.
 */
export function useGravityData(params: GravityPollDetailsParams) {
  const [{ data: poll }, { data: aggregated }] = useSuspenseQueries({
    queries: [
      gravityPollDetailsQuery(params),
      gravityVoteDataQuery(params.pollId),
    ],
  });

  return { poll, aggregated };
}

/**
 * Track whether a date has passed, triggering a single re-render when it does.
 */
function useDatePassed(date: string) {
  const [hasPassed, setHasPassed] = useState(
    () => new Date() >= new Date(date),
  );

  useEffect(() => {
    if (hasPassed) return;

    const msUntilDate = new Date(date).getTime() - Date.now();
    if (msUntilDate <= 0) {
      setHasPassed(true);
      return;
    }

    const timeout = setTimeout(() => setHasPassed(true), msUntilDate);
    return () => clearTimeout(timeout);
  }, [date, hasPassed]);

  return hasPassed;
}

/**
 * Derive vote data and poll for reveals during the "live" phase.
 */
export function useReveals(params: UseRevealsOptions): UseRevealsResult {
  const { pollId, startDate, endDate, aggregated } = params;
  const votingStarted = useDatePassed(startDate);
  const votingEnded = useDatePassed(endDate);

  // poll for reveals during "live" phase using infinite query for accumulation
  // only poll if: voting ended AND aggregated has no reveals (not finalized)
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["gravity", "reveals", pollId],
      queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
        $fetchRevealedVotes({
          data: { pollId, cursor: pageParam },
        }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: () => votingEnded && aggregated.reveals.length === 0,
    });

  // merge reveal sources: use aggregated.reveals (finalized) or polled data (live)
  const reveals = useMemo((): Reveal[] => {
    if (aggregated.reveals.length > 0) {
      return aggregated.reveals;
    }
    return data?.pages.flatMap((page) => page.votes) ?? [];
  }, [aggregated.reveals, data]);

  const remainingVotesCount = aggregated.totalVoteCount - reveals.length;

  const liveStatus = useMemo((): LiveStatus => {
    if (!votingStarted) {
      return "upcoming";
    }
    if (!votingEnded) {
      return "voting";
    }
    return remainingVotesCount === 0 ? "finalized" : "live";
  }, [votingStarted, votingEnded, remainingVotesCount]);

  // manual polling interval
  useEffect(() => {
    if (liveStatus !== "live") return;

    const interval = setInterval(() => {
      if (!isFetchingNextPage && hasNextPage) {
        void fetchNextPage();
      }
    }, REVEAL_POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [liveStatus, fetchNextPage, isFetchingNextPage, hasNextPage]);

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
        pollId: 0, // we don't query this nor is it used
        hash: vote.id,
      }));
  }, [topVotesWithReveals]);

  // compute COMO per candidate from reveals
  const comoPerCandidate = useMemo((): number[] => {
    if (reveals.length === 0) {
      return [];
    }
    const comoMap = new Map<number, number>();
    for (const reveal of reveals) {
      comoMap.set(
        reveal.candidateId,
        (comoMap.get(reveal.candidateId) ?? 0) + reveal.amount,
      );
    }
    const maxId = Math.max(0, ...comoMap.keys());
    return Array.from({ length: maxId + 1 }, (_, i) => comoMap.get(i) ?? 0);
  }, [reveals]);

  return {
    status: "success",
    liveStatus,
    isRefreshing: isFetchingNextPage,
    totalVotesCount: aggregated.totalVoteCount,
    remainingVotesCount,
    comoPerCandidate,
    revealedVotes,
    chartData: aggregated.chartData,
    topVotes: topVotesWithReveals,
    topUsers: topUsersWithReveals,
  } satisfies UseRevealsResult;
}
