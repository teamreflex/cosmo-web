import { $fetchRevealedVotes } from "@/lib/functions/gravity";
import {
  type GravityPollDetailsParams,
  gravityPollDetailsQuery,
  gravityVoteDataQuery,
} from "@/lib/queries/gravity";
import type { CosmoPollChoices } from "@apollo/cosmo/types/gravity";
import { useInfiniteQuery, useSuspenseQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ChartLine } from "../colors";
import { findLatestBatch, sumComoPerCandidate } from "../reveals";
import type { RevealBatch } from "../reveals";
import { computeChartSeries, slotLineCount } from "../series";
import type { ChartSeries } from "../series";
import { buildSlotModel, rankSlots } from "../slots";
import type { PollSlotModel, SlotRanking } from "../slots";
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

    // a 0ms timeout still fires asynchronously, avoiding a synchronous setState in the effect
    const msUntilDate = new Date(date).getTime() - Date.now();
    const timeout = setTimeout(
      () => setHasPassed(true),
      Math.max(0, msUntilDate),
    );
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
  const { data, fetchNextPage, refetch, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["gravity", "reveals", pollId],
      queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
        $fetchRevealedVotes({
          data: { pollId, cursor: pageParam },
        }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: () => votingEnded && aggregated.reveals.length === 0,
      // a focus/remount refetch replays every accumulated page sequentially and
      // collapses the batch history the deltas derive from; the interval below
      // is the only refresher
      staleTime: Infinity,
      refetchOnWindowFocus: false,
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
      if (isFetchingNextPage) return;

      if (hasNextPage) {
        void fetchNextPage();
      } else {
        // no next page yet - refetch from start to check for new reveals
        void refetch();
      }
    }, REVEAL_POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [liveStatus, fetchNextPage, refetch, isFetchingNextPage, hasNextPage]);

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

  // compute COMO per candidate from reveals
  const comoPerCandidate = useMemo(
    (): number[] => sumComoPerCandidate(reveals),
    [reveals],
  );

  // deltas only exist while counting: a finalized poll arrives fully revealed,
  // with no batch history to compare against
  const latestBatch = useMemo(
    (): RevealBatch | null =>
      liveStatus === "live" ? findLatestBatch(data?.pages ?? []) : null,
    [liveStatus, data],
  );

  return {
    liveStatus,
    isRefreshing: isFetchingNextPage,
    totalVotesCount: aggregated.totalVoteCount,
    remainingVotesCount,
    comoPerCandidate,
    latestBatch,
    reveals,
    chartData: aggregated.chartData,
    topVotes: topVotesWithReveals,
    topUsers: topUsersWithReveals,
  } satisfies UseRevealsResult;
}

/**
 * Group a poll's candidates into the slots they are raced in.
 */
export function usePollSlots(poll: CosmoPollChoices): PollSlotModel {
  return useMemo(() => buildSlotModel(poll), [poll]);
}

/**
 * Cumulative COMO for every line the chart draws.
 */
export function useChartSeries(
  model: PollSlotModel,
  groups: ChartLine[][],
  live: UseRevealsResult,
): ChartSeries {
  return useMemo(
    () =>
      computeChartSeries({
        chartData: live.chartData,
        reveals: live.reveals,
        comoPerCandidate: live.comoPerCandidate,
        complete: live.liveStatus === "finalized",
        groups,
        linesPerSlot: slotLineCount(model),
      }),
    [
      model,
      groups,
      live.chartData,
      live.reveals,
      live.comoPerCandidate,
      live.liveStatus,
    ],
  );
}

/**
 * Rank every slot's candidates by revealed COMO.
 */
export function useSlotRankings(
  model: PollSlotModel,
  comoPerCandidate: number[],
  latestBatch: RevealBatch | null,
): SlotRanking[] {
  return useMemo(
    () => rankSlots(model, comoPerCandidate, latestBatch),
    [model, comoPerCandidate, latestBatch],
  );
}
