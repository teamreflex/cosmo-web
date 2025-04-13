import { decodeFunctionData, type Hex } from "viem";
import { useBlockNumber, useClient, useWatchContractEvent } from "wagmi";
import governorAbi from "@/abi/governor";
import { baseUrl, safeBigInt } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { getContractEvents, getTransaction } from "viem/actions";
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { GravityHookParams, RevealedVote, RevealLog, VoteLog } from "./types";
import { QUERY_KEYS } from "./queries";
import { hashFn } from "wagmi/query";
import { chunkBlocks } from "./util";
import { ofetch } from "ofetch";
import { CosmoPollChoices } from "@/lib/universal/cosmo/gravity";

// tripleS governor contract start block
const START_BLOCK = BigInt(29388703);

/**
 * Default config for interacting with the Governor contract.
 */
function createGovernorConfig(address: string | Hex) {
  return {
    abi: governorAbi,
    address: address as Hex,
  } as const;
}

/**
 * Fetch the start block for a given poll.
 */
function usePollStartBlock(params: GravityHookParams) {
  const config = createGovernorConfig(params.contract as Hex);
  const client = useClient();
  return useQuery({
    queryKey: QUERY_KEYS.POLL_START_BLOCK(params),
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
  const config = createGovernorConfig(params.contract as Hex);
  const client = useClient();
  return useQuery({
    queryKey: QUERY_KEYS.POLL_END_BLOCK(params),
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
  const config = createGovernorConfig(params.contract as Hex);
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
          QUERY_KEYS.POLL_START_BLOCK(params),
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
          QUERY_KEYS.POLL_END_BLOCK(params),
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
 * Fetch the initial vote data for a given poll.
 */
function useInitialVotes(params: GravityHookParams) {
  const { startBlock, endBlock, currentBlock } = usePollStatus(params);
  const config = createGovernorConfig(params.contract as Hex);
  const client = useClient();
  return useQuery({
    queryKey: QUERY_KEYS.VOTES(params),
    queryKeyHashFn: hashFn,
    queryFn: async () => {
      if (!startBlock || !currentBlock) return new Map<number, VoteLog>();

      // fetch events in chunks of 2000 blocks
      const votes = new Map<number, VoteLog>();
      await chunkBlocks({
        start: startBlock,
        end: endBlock,
        current: currentBlock,
        cb: async ({ fromBlock, toBlock }) => {
          const events = await getContractEvents(client!, {
            ...config,
            eventName: "Voted",
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
            args: {
              pollId: params.pollId,
            },
            strict: true,
          });

          for (const event of events) {
            votes.set(Number(event.args.voteIndex), {
              ...event.args,
              blockNumber: Number(event.blockNumber),
            });
          }
        },
      });
      return votes;
    },
    enabled:
      client !== undefined && startBlock !== null && currentBlock !== null,
    staleTime: Infinity,
  });
}

/**
 * Fetch the initial reveal data for a given poll.
 */
function useInitialReveals(params: GravityHookParams) {
  const { startBlock, endBlock, currentBlock } = usePollStatus(params);
  const config = createGovernorConfig(params.contract as Hex);
  const client = useClient();
  return useQuery({
    queryKey: QUERY_KEYS.REVEALS(params),
    queryKeyHashFn: hashFn,
    queryFn: async () => {
      if (!startBlock || !currentBlock) return new Map<number, RevealLog>();

      // fetch events in chunks of 2000 blocks
      const reveals = new Map<number, RevealLog>();
      await chunkBlocks({
        start: startBlock,
        end: endBlock,
        current: currentBlock,
        cb: async ({ fromBlock, toBlock }) => {
          const events = await getContractEvents(client!, {
            ...config,
            eventName: "Revealed",
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
            args: {
              pollId: params.pollId,
            },
            strict: true,
          });

          // fetch transaction data for reveal events
          const transactionHashes = events.map(
            (event) => event.transactionHash
          );
          const transactions = await Promise.all(
            transactionHashes.map((hash) =>
              getTransaction(client!, { hash }).then((tx) => {
                return decodeFunctionData({
                  abi: governorAbi,
                  data: tx.input,
                });
              })
            )
          );

          for (const tx of transactions.filter(
            (tx) => tx.functionName === "reveal"
          )) {
            const [pollId, data, offset] = tx.args;
            for (let i = 0; i < data.length; i++) {
              const voteIndex = Number(offset) + i;
              reveals.set(voteIndex, {
                pollId,
                voteIndex: BigInt(voteIndex),
                candidateId: data[i].votedCandidateId,
              });
            }
          }
        },
      });

      return reveals;
    },
    enabled:
      client !== undefined && startBlock !== null && currentBlock !== null,
    staleTime: Infinity,
  });
}

/**
 * Poll for vote events.
 */
function useVotePolling(params: GravityHookParams) {
  const { isPending, startBlock, endBlock } = usePollStatus(params);
  const config = createGovernorConfig(params.contract as Hex);
  const queryClient = useQueryClient();
  const initialQuery = useInitialVotes(params);

  /**
   * only poll for data when:
   * - block status has been loaded
   * - initial vote data has been loaded
   * - gravity is active (endBlock is null)
   */
  const shouldPoll =
    isPending === false &&
    initialQuery.status === "success" &&
    startBlock !== null &&
    endBlock === null;

  // watch for vote events
  useWatchContractEvent({
    ...config,
    eventName: "Voted",
    args: {
      pollId: params.pollId,
    },
    strict: true,
    onLogs: (logs) => {
      queryClient.setQueryData(
        QUERY_KEYS.VOTES(params),
        (prev: Map<number, VoteLog>) => {
          for (const log of logs) {
            prev.set(Number(log.args.voteIndex), {
              ...log.args,
              blockNumber: Number(log.blockNumber),
            });
          }
          return prev;
        }
      );
    },
    enabled: shouldPoll,
  });

  return initialQuery;
}

/**
 * Poll for reveal events.
 */
function useRevealPolling(params: GravityHookParams) {
  const { isPending, startBlock, endBlock } = usePollStatus(params);
  const config = createGovernorConfig(params.contract as Hex);
  const client = useClient();
  const queryClient = useQueryClient();
  const initialQuery = useInitialReveals(params);

  /**
   * only poll for data when:
   * - block status has been loaded
   * - initial vote data has been loaded
   * - gravity is active (endBlock is null)
   */
  const shouldPoll =
    isPending === false &&
    initialQuery.status === "success" &&
    startBlock !== null &&
    endBlock === null;

  // watch for reveal events
  const [revealHashes, setRevealHashes] = useState<Hex[]>([]);
  useWatchContractEvent({
    ...config,
    eventName: "Revealed",
    args: {
      pollId: params.pollId,
    },
    strict: true,
    onLogs(logs) {
      setRevealHashes(logs.map((log) => log.transactionHash));
    },
    enabled: shouldPoll,
  });

  // fetch transaction data for reveal events
  useEffect(() => {
    if (!shouldPoll) return;

    async function fetchRevealTransactions() {
      if (!client) return;

      const promises = revealHashes.map((hash) =>
        getTransaction(client, { hash }).then((tx) => {
          return decodeFunctionData({
            abi: governorAbi,
            data: tx.input,
          });
        })
      );

      const transactions = await Promise.all(promises).then((txs) =>
        txs.filter((tx) => tx.functionName === "reveal")
      );

      queryClient.setQueryData(
        QUERY_KEYS.REVEALS(params),
        (prev: Map<number, RevealLog>) => {
          for (const tx of transactions) {
            const [pollId, data, offset] = tx.args;
            for (let i = 0; i < data.length; i++) {
              const voteIndex = Number(offset) + i;
              prev.set(voteIndex, {
                pollId,
                voteIndex: BigInt(voteIndex),
                candidateId: data[i].votedCandidateId,
              });
            }
          }
          return prev;
        }
      );
    }

    fetchRevealTransactions();
  }, [client, revealHashes, shouldPoll, queryClient, params]);

  return initialQuery;
}

/**
 * Zips together vote and reveal data.
 */
export function useLiveData(params: GravityHookParams) {
  const votesQuery = useVotePolling(params);
  const revealsQuery = useRevealPolling(params);

  const isPending = votesQuery.isPending || revealsQuery.isPending;
  const revealedVotes = useMemo(() => {
    if (votesQuery.data === undefined) {
      return [];
    }

    return votesQuery.data.entries().reduce((acc, [voteIndex, vote]) => {
      const reveal = revealsQuery.data?.get(Number(voteIndex));
      if (!reveal) return acc;

      acc.push({
        pollId: Number(vote.pollId),
        voter: vote.voter,
        comoAmount: safeBigInt(vote.comoAmount),
        candidateId: Number(reveal.candidateId),
        blockNumber: vote.blockNumber,
      });

      return acc;
    }, [] as RevealedVote[]);
  }, [votesQuery.data, revealsQuery.data]);

  return { revealedVotes, isPending };
}

type UseSuspenseGravityPollParams = {
  artistName: string;
  gravityId: number;
  pollId: number;
};

/**
 * Fetch a poll and its candidates.
 */
export function useSuspenseGravityPoll(params: UseSuspenseGravityPollParams) {
  return useSuspenseQuery({
    queryKey: [
      "gravity-poll",
      params.artistName,
      params.gravityId,
      params.pollId,
    ],
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
