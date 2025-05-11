import { type Hex } from "viem";
import {
  useBlockNumber,
  useClient,
  useReadContracts,
  useWatchContractEvent,
} from "wagmi";
import governorAbi from "@/abi/governor";
import { Addresses } from "@/lib/utils";
import { useMemo } from "react";
import { getContractEvents } from "viem/actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GravityHookParams } from "./types";
import { GRAVITY_QUERY_KEYS } from "./queries";
import { hashFn } from "wagmi/query";
import { CosmoPollChoices } from "@/lib/universal/cosmo/gravity";

// cosmo governor contract start block
const START_BLOCK = BigInt(6363806);

// polling interval in ms
const POLLING_INTERVAL = 5000;

/**
 * Default config for interacting with the Governor contract.
 */
function createGovernorConfig() {
  return {
    abi: governorAbi,
    address: Addresses.GRAVITY as Hex,
  } as const;
}

/**
 * Fetch the start block for a given poll.
 */
function usePollStartBlock(params: GravityHookParams) {
  const config = createGovernorConfig();
  const client = useClient();
  return useQuery({
    queryKey: GRAVITY_QUERY_KEYS.POLL_START_BLOCK(params),
    queryKeyHashFn: hashFn,
    queryFn: async () => {
      const events = await getContractEvents(client!, {
        ...config,
        eventName: "PollCreated",
        fromBlock: START_BLOCK,
        args: {
          pollId: params.pollId,
        },
        strict: true,
      });

      const event = events.find((event) => event.args.pollId === params.pollId);
      return event ? Number(event.blockNumber) : null;
    },
    enabled: client !== undefined,
    staleTime: Infinity,
  });
}

/**
 * Fetch the end block for a given poll.
 */
function usePollEndBlock(params: GravityHookParams) {
  const config = createGovernorConfig();
  const client = useClient();
  return useQuery({
    queryKey: GRAVITY_QUERY_KEYS.POLL_END_BLOCK(params),
    queryKeyHashFn: hashFn,
    queryFn: async () => {
      const events = await getContractEvents(client!, {
        ...config,
        eventName: "Finalized",
        fromBlock: START_BLOCK,
        args: {
          pollId: params.pollId,
        },
        strict: true,
      });

      const event = events.find((event) => event.args.pollId === params.pollId);
      return event ? Number(event.blockNumber) : null;
    },
    enabled: client !== undefined,
    staleTime: Infinity,
  });
}

/**
 * Find the start and finalized blocks for a given poll.
 */
function usePollStatus(params: GravityHookParams) {
  const config = createGovernorConfig();
  const queryClient = useQueryClient();
  const startQuery = usePollStartBlock(params);
  const endQuery = usePollEndBlock(params);
  const currentQuery = useBlockNumber({
    watch: false,
    cacheTime: Infinity,
  });

  // find and update the start block
  useWatchContractEvent({
    ...config,
    eventName: "PollCreated",
    onLogs: (logs) => {
      const event = logs.find((log) => log.args.pollId === params.pollId);
      if (event) {
        queryClient.setQueryData(
          GRAVITY_QUERY_KEYS.POLL_START_BLOCK(params),
          Number(event.blockNumber)
        );
      }
    },
    enabled: startQuery.status === "success" && startQuery.data === undefined,
  });

  // find and update the finalized block
  useWatchContractEvent({
    ...config,
    eventName: "Finalized",
    onLogs: (logs) => {
      const event = logs.find((log) => log.args.pollId === params.pollId);
      if (event) {
        queryClient.setQueryData(
          GRAVITY_QUERY_KEYS.POLL_END_BLOCK(params),
          Number(event.blockNumber)
        );
      }
    },
    enabled: endQuery.status === "success" && endQuery.data === undefined,
  });

  return {
    isPending:
      startQuery.isPending || endQuery.isPending || currentQuery.isPending,
    startBlock: startQuery.data ?? null,
    endBlock: endQuery.data ?? null,
    currentBlock: currentQuery.data ? Number(currentQuery.data) : null,
  };
}

/**
 * Fetch and conditionally poll the chain for vote data.
 */
export function useChainData(params: GravityHookParams) {
  const { startBlock, endBlock } = usePollStatus(params);
  const config = createGovernorConfig();

  const args = [BigInt(params.tokenId), BigInt(params.pollId)] as const;
  const shouldPoll = startBlock !== null && endBlock === null;

  const { data, status, error } = useReadContracts({
    contracts: [
      { ...config, args, functionName: "totalVotesCount" },
      { ...config, args, functionName: "votesPerCandidates" },
      { ...config, args, functionName: "remainingVotesCount" },
    ],
    query: {
      refetchInterval: shouldPoll ? POLLING_INTERVAL : false,
    },
  });

  if (status === "pending") {
    return {
      isPending: true,
      totalVotesCount: 0,
      comoPerCandidate: [],
      remainingVotesCount: 0,
    };
  }

  if (status === "error") {
    return {
      isPending: false,
      error: error,
    };
  }

  const [total, comoPerCandidate, remaining] = data;
  console.log({ total, comoPerCandidate, remaining });

  return {
    isPending: false,
    totalVotesCount: total.status === "success" ? Number(total.result) : 0,
    comoPerCandidate:
      comoPerCandidate.status === "success"
        ? comoPerCandidate.result.map((candidate) => Number(candidate))
        : [],
    remainingVotesCount:
      remaining.status === "success" ? Number(remaining.result) : 0,
  };
}

type UseGravityPollParams = {
  artistName: string;
  tokenId: number;
  poll: CosmoPollChoices;
};

/**
 * Zips together vote and reveal data.
 */
export function useGravityPoll(params: UseGravityPollParams) {
  const chain = useChainData({
    tokenId: params.tokenId,
    pollId: BigInt(params.poll.pollIdOnChain),
  });

  // get the number of como used for each candidate
  const { comoByCandidate, comoUsed } = useMemo(() => {
    const comoByCandidate: Record<string, number> = {};
    let comoUsed = 0;
    for (let i = 0; i < params.poll.choices.length; i++) {
      const candidate = params.poll.choices[i];
      const chainComo = chain.comoPerCandidate?.[i] ?? 0;
      comoByCandidate[candidate.id] = chainComo;
      comoUsed += chainComo;
    }
    return { comoByCandidate, comoUsed };
  }, [params.poll.choices, chain.comoPerCandidate]);

  return {
    isPending: chain.isPending,
    totalVotesCount: chain.totalVotesCount ?? 0,
    comoByCandidate,
    comoUsed,
  };
}
