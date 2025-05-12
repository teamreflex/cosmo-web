import { type Hex } from "viem";
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
import {
  GravityHookParams,
  UseBlockStatus,
  UseChainData,
  UseChainDataError,
  UseChainDataOptions,
  UseChainDataPending,
  UseChainDataSuccess,
} from "./types";
import { hashFn } from "wagmi/query";
import { useMemo } from "react";

// abstract's average block time
const AVG_BLOCK_TIME = 1.028;
// polling interval in ms
const POLLING_INTERVAL = 5000;

/**
 * Default config for interacting with the Governor contract.
 */
const config = {
  abi: governorAbi,
  address: Addresses.GRAVITY as Hex,
};

/**
 * Fetch the start block for a given poll.
 */
function useStartBlock(startDate: string) {
  const { data: currentBlock } = useBlockNumber({
    watch: false,
    cacheTime: Infinity,
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
function useEndBlock(params: GravityHookParams, startBlock: number | null) {
  const queryClient = useQueryClient();
  const client = useClient();

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
    queryKeyHashFn: hashFn,
    queryFn: async () => {
      const events = await getContractEvents(client!, {
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
      startBlock !== null &&
      endQuery.status === "success" &&
      endQuery.data === null,
  });

  return endQuery;
}

/**
 * Find the start and finalized blocks for a given poll.
 */
function useBlockStatus({
  startDate,
  ...params
}: UseChainDataOptions): UseBlockStatus {
  const startBlock = useStartBlock(startDate);
  const endQuery = useEndBlock(params, startBlock);

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
    blockStatus.isPending === false &&
    blockStatus.startBlock !== null &&
    blockStatus.endBlock === null;

  const { data, status, error } = useReadContracts({
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
  const isLive =
    blockStatus.isPending === false && blockStatus.endBlock === null;
  const totalVotesCount = total.status === "success" ? Number(total.result) : 0;
  const remainingVotesCount =
    remaining.status === "success" ? Number(remaining.result) : 0;

  return {
    status: "success",
    isLive,
    totalVotesCount,
    remainingVotesCount,
    comoPerCandidate:
      comoPerCandidate.status === "success"
        ? comoPerCandidate.result.map((candidate) => Number(candidate))
        : [],
  } satisfies UseChainDataSuccess;
}
