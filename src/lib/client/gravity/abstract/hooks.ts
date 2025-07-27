import type { Hex } from "viem";
import {
  useBlockNumber,
  useClient,
  useReadContracts,
  useWatchContractEvent,
} from "wagmi";
import governorAbi from "@/abi/governor";
import { Addresses } from "@/lib/utils";
import { getContractEvents } from "viem/actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseBlockStatus,
  UseChainData,
  UseChainDataError,
  UseChainDataOptions,
  UseChainDataPending,
  UseChainDataSuccess,
} from "./types";
import { useEffect, useMemo, useState } from "react";
import { abstract } from "viem/chains";
import type { GravityHookParams } from "../common";
import { useGravityVotes } from "../common";
import { isAfter, isBefore, startOfHour, addMinutes } from "date-fns";

// chain to connect to
const chainId = abstract.id;
// abstract's average block time
const AVG_BLOCK_TIME = 1.028;
// polling interval in ms
const POLLING_INTERVAL = 2500;

/**
 * Default config for interacting with the Governor contract.
 */
const config = {
  abi: governorAbi,
  address: Addresses.GRAVITY as Hex,
};

/**
 * Get the current date and updates with the polling interval.
 */
export function useCurrentDate() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return date;
}

/**
 * Fetch the start block for a given poll.
 */
function useStartBlock(startDate: string) {
  const { data: currentBlock } = useBlockNumber({
    watch: false,
    cacheTime: Infinity,
    query: {
      enabled: (query) => query.state.data === undefined,
    },
  });

  /**
   * Estimate the start block based on average block time.
   * Generally gets within ~15 minutes, so substract 2k blocks to be safe.
   */
  const startBlock = useMemo(() => {
    if (!currentBlock) {
      return null;
    }

    const startTimestamp = new Date(startDate).getTime();
    const diff = (Date.now() - startTimestamp) / 1000;
    const blocksSinceStart = Math.floor(diff / AVG_BLOCK_TIME);
    const estimatedStartBlock = Number(currentBlock) - blocksSinceStart;
    return estimatedStartBlock - 2000;
  }, [currentBlock, startDate]);

  return startBlock;
}

/**
 * Fetch the end block for a given poll.
 */
function useEndBlock(
  params: GravityHookParams,
  startBlock: number | null,
  endDate: string,
  now: Date
) {
  const queryClient = useQueryClient();
  const client = useClient({ chainId });

  const queryKey = [
    "gravity",
    "end-block",
    { tokenId: params.tokenId },
    Number(params.pollId),
  ];

  /**
   * Fetch the end block.
   */
  const endQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const events = await getContractEvents(client, {
        ...config,
        eventName: "Finalized",
        fromBlock: startBlock ? BigInt(startBlock) : undefined,
        args: {
          tokenId: params.tokenId,
          pollId: params.pollId,
        },
        strict: true,
      });

      const event = events.find((event) => event.args.pollId === params.pollId);
      return event ? Number(event.blockNumber) : null;
    },
    enabled: client !== undefined && startBlock !== null,
    staleTime: Infinity,
  });

  /**
   * Poll for the end block if the initial block is not found.
   */
  useWatchContractEvent({
    ...config,
    eventName: "Finalized",
    fromBlock: startBlock ? BigInt(startBlock) : undefined,
    onLogs: (logs) => {
      const event = logs.find((log) => log.args.pollId === params.pollId);
      if (event) {
        queryClient.setQueryData(queryKey, Number(event.blockNumber));
      }
    },
    enabled:
      // wait for start block estimation
      startBlock !== null &&
      // wait for end block initial fetch
      endQuery.status === "success" &&
      // ensure end block wasn't found yet
      endQuery.data === null &&
      // ensure poll has ended
      isBefore(new Date(endDate), now),
  });

  return endQuery;
}

/**
 * Find the start and finalized blocks for a given poll.
 */
function useBlockStatus({
  startDate,
  endDate,
  now,
  ...params
}: UseChainDataOptions): UseBlockStatus {
  const startBlock = useStartBlock(startDate);
  const endQuery = useEndBlock(params, startBlock, endDate, now);

  if (startBlock === null || endQuery.isPending) {
    return { isPending: true };
  }

  return {
    isPending: false,
    startBlock: startBlock,
    endBlock: endQuery.data ?? null,
  };
}

/**
 * Fetch and conditionally poll the chain for vote data.
 */
export function useChainData(params: UseChainDataOptions): UseChainData {
  const blockStatus = useBlockStatus(params);

  const args = [BigInt(params.tokenId), BigInt(params.pollId)] as const;
  const shouldPoll =
    // ensure all block statuses are ready
    blockStatus.isPending === false &&
    // ensure start block is estimated
    blockStatus.startBlock !== null &&
    // ensure end block is not found yet
    blockStatus.endBlock === null &&
    // ensure poll has ended
    isBefore(new Date(params.endDate), params.now);

  const { data, status, error, isFetching } = useReadContracts({
    contracts: [
      { ...config, args, functionName: "totalVotesCount" },
      { ...config, args, functionName: "votesPerCandidates" },
      { ...config, args, functionName: "remainingVotesCount" },
    ],
    query: {
      refetchInterval: shouldPoll ? POLLING_INTERVAL : false,
      refetchIntervalInBackground: true,
    },
  });

  const liveStatus = useMemo(() => {
    // poll is still voting
    if (isAfter(new Date(params.endDate), params.now)) {
      return "voting";
    }

    // haven't found the Finalized event yet
    if (blockStatus.isPending === false && blockStatus.endBlock !== null) {
      return "finalized";
    }

    return "live";
  }, [blockStatus, params.endDate, params.now]);

  if (status === "pending") {
    return {
      status: "pending",
    } satisfies UseChainDataPending;
  }

  if (status === "error") {
    return {
      status: "error",
      error: error.message,
    } satisfies UseChainDataError;
  }

  const [total, comoPerCandidate, remaining] = data;
  const totalVotesCount = total.status === "success" ? Number(total.result) : 0;
  const remainingVotesCount =
    remaining.status === "success" ? Number(remaining.result) : 0;

  return {
    status: "success",
    liveStatus,
    isRefreshing: isFetching,
    totalVotesCount,
    remainingVotesCount,
    comoPerCandidate:
      comoPerCandidate.status === "success"
        ? comoPerCandidate.result.map((candidate) => Number(candidate))
        : [],
  } satisfies UseChainDataSuccess;
}

/**
 * Timeline data point for vote visualization.
 */
export interface VoteTimelineSegment {
  timestamp: Date;
  voteCount: number;
  totalTokenAmount: number;
}

/**
 * Fetch all Voted events and format them for timeline visualization.
 * Groups votes by 30-minute time segments for consistent visualization.
 */
export function useVotedEvents(
  pollId: number,
  endDate: string
): VoteTimelineSegment[] {
  const { data: votes } = useGravityVotes(pollId);

  // Process votes into time-based segments
  const data = useMemo(() => {
    if (votes.length === 0) {
      return [];
    }

    // Find the first vote timestamp and use endDate for range
    const voteTimes = votes.map((vote) => new Date(vote.createdAt));
    const earliestVoteTime = new Date(
      Math.min(...voteTimes.map((t) => t.getTime()))
    );
    const endTime = new Date(endDate);

    // Generate 30-minute time segments from first vote to end date
    const segments: VoteTimelineSegment[] = [];
    const segmentMap = new Map<string, VoteTimelineSegment>();

    // Start from the 30-minute segment containing the first vote
    const firstVoteHour = startOfHour(earliestVoteTime);
    let currentTime =
      earliestVoteTime.getMinutes() < 30
        ? firstVoteHour
        : addMinutes(firstVoteHour, 30);

    while (currentTime < endTime) {
      const segment = {
        timestamp: currentTime,
        voteCount: 0,
        totalTokenAmount: 0,
      };

      segments.push(segment);
      segmentMap.set(currentTime.toISOString(), segment);

      currentTime = addMinutes(currentTime, 30);
    }

    // Populate segments with vote data using exact timestamps
    votes.forEach((vote) => {
      const voteTime = new Date(vote.createdAt);

      // Find the appropriate 30-minute segment
      const hour = startOfHour(voteTime);
      const segmentTime =
        voteTime.getMinutes() < 30 ? hour : addMinutes(hour, 30);

      const segment = segmentMap.get(segmentTime.toISOString());
      if (segment) {
        segment.voteCount += 1;
        segment.totalTokenAmount += vote.amount;
      }
    });

    return segments;
  }, [votes, endDate]);

  return data;
}
