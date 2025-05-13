import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { gravities, polygonVotes } from "./db/schema";
import { alchemy } from "./http";
import { fetchGravity, fetchPoll } from "./cosmo/gravity";
import { ValidArtist } from "../universal/cosmo/common";
import { getProxiedToken } from "./handlers/withProxiedToken";
import { chunkBlocks, findPoll } from "../client/gravity/util";
import {
  Client,
  createPublicClient,
  decodeFunctionData,
  Hex,
  http,
} from "viem";
import { polygon } from "viem/chains";
import { env } from "@/env";
import {
  RevealedVote,
  RevealLog,
  VoteLog,
} from "../client/gravity/polygon/types";
import { getContractEvents, getTransaction } from "viem/actions";
import governorAbi from "@/abi/governor-polygon";
import { safeBigInt } from "../utils";
import { unstable_cacheLife } from "next/cache";

/**
 * Fetch all gravities and group them by artist.
 */
export async function fetchGravities() {
  const data = await db
    .select()
    .from(gravities)
    .orderBy(desc(gravities.startDate));
  return Object.groupBy(data, (r) => r.artist);
}

/**
 * Fetch on-chain data for a Polygon gravity.
 * Cached for 30 days.
 */
export async function fetchPolygonGravity(artist: ValidArtist, id: number) {
  "use cache";
  unstable_cacheLife({
    stale: 60 * 60 * 24 * 30, // 30 days
    revalidate: 60 * 60 * 24 * 30, // 30 days
  });

  // 0. build viem client
  const client = createPublicClient({
    chain: polygon,
    transport: http(`https://polygon-mainnet.g.alchemy.com/v2`, {
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${env.ALCHEMY_KEY}`,
        },
      },
      name: "polygon",
      batch: true,
    }),
  });

  // 1. get a cosmo token
  const { accessToken } = await getProxiedToken();

  // 2. fetch gravity from cosmo
  const gravity = await fetchGravity(artist, id);
  if (!gravity) {
    throw new GravityMissingError();
  }

  // 3. fetch poll details
  const poll = await fetchPoll(
    accessToken,
    artist,
    gravity.id,
    findPoll(gravity).poll.id
  );

  // 4. fetch block numbers
  const [start, end, current] = await Promise.all([
    getBlockByTimestamp(poll.startDate),
    getBlockByTimestamp(poll.revealDate),
    getBlockByTimestamp(new Date().toISOString()),
  ]);
  if (!start || !end || !current) {
    console.error("Failed to fetch block numbers", { start, end, current });
    throw new BlockNumbersMissingError();
  }

  // 5. fetch votes and reveals in parallel
  const opts = {
    client,
    startBlock: start,
    endBlock: end,
    currentBlock: current,
    contract: ADDRESSES[artist],
    pollId: BigInt(poll.pollIdOnChain),
  };
  const [votes, reveals] = await Promise.all([
    fetchPolygonVotes(opts),
    fetchPolygonReveals(opts),
  ]);

  // 6. zip reveals onto votes
  const revealedVotes = votes
    .entries()
    .reduce((acc, [voteIndex, vote]) => {
      const reveal = reveals.get(Number(voteIndex));
      if (!reveal) return acc;

      acc.push({
        hash: vote.hash,
        pollId: Number(vote.pollId),
        voter: vote.voter,
        comoAmount: safeBigInt(vote.comoAmount),
        candidateId: Number(reveal.candidateId),
        blockNumber: vote.blockNumber,
      });

      return acc;
    }, [] as RevealedVote[])
    .sort((a, b) => b.comoAmount - a.comoAmount);

  // 7. aggregate como by candidate
  const comoByCandidate = revealedVotes.reduce((acc, vote) => {
    const id = vote.candidateId.toString();
    acc[id] = (acc[id] ?? 0) + vote.comoAmount;
    return acc;
  }, {} as Record<string, number>);

  // 8. calculate total como used
  const totalComoUsed = votes.values().reduce((acc, vote) => {
    return acc + safeBigInt(vote.comoAmount);
  }, 0);

  return { poll, revealedVotes, comoByCandidate, totalComoUsed };
}

type GetBlockByTimestamp = {
  network: string;
  block: {
    number: number;
    timestamp: string;
  };
};

/**
 * Get the block number for a given timestamp.
 */
async function getBlockByTimestamp(
  timestamp: string,
  network: string = "polygon-mainnet"
) {
  const { data } = await alchemy<{ data: GetBlockByTimestamp[] }>(
    "/utility/blocks/by-timestamp",
    {
      query: {
        networks: network,
        timestamp,
        direction: "BEFORE",
      },
    }
  );

  return data.find((r) => r.network === network)?.block.number;
}

type FetchRPCDataParams = {
  client: Client;
  startBlock: number;
  endBlock: number;
  currentBlock: number;
  contract: Hex;
  pollId: bigint;
};

/**
 * Fetch all votes.
 */
async function fetchPolygonVotes(opts: FetchRPCDataParams) {
  const votes = new Map<number, VoteLog>();

  // chunk log fetching by 2000 blocks
  const chunks = await chunkBlocks({
    start: opts.startBlock,
    end: opts.endBlock,
    current: opts.currentBlock,
    cb: ({ fromBlock, toBlock }) => {
      return getContractEvents(opts.client, {
        abi: governorAbi,
        address: opts.contract,
        eventName: "Voted",
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        args: {
          pollId: opts.pollId,
        },
        strict: true,
      });
    },
  });

  // set the vote data for each chunk
  for (const chunk of chunks) {
    for (const event of chunk) {
      votes.set(Number(event.args.voteIndex), {
        ...event.args,
        blockNumber: Number(event.blockNumber),
      });
    }
  }

  return votes;
}

/**
 * Fetch all vote reveals.
 */
async function fetchPolygonReveals(opts: FetchRPCDataParams) {
  const reveals = new Map<number, RevealLog>();

  // chunk log fetching by 2000 blocks
  const chunks = await chunkBlocks({
    start: opts.startBlock,
    end: opts.endBlock,
    current: opts.currentBlock,
    cb: async ({ fromBlock, toBlock }) => {
      // fetch log events
      const events = await getContractEvents(opts.client, {
        abi: governorAbi,
        address: opts.contract,
        eventName: "Revealed",
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        args: {
          pollId: opts.pollId,
        },
        strict: true,
      });

      // fetch transaction data for reveal events
      const transactionHashes = events.map((event) => event.transactionHash);

      // return transaction data
      return await Promise.all(
        transactionHashes.map((hash) =>
          getTransaction(opts.client, { hash }).then((tx) => {
            return decodeFunctionData({
              abi: governorAbi,
              data: tx.input,
            });
          })
        )
      );
    },
  });

  // set the reveal data for each chunk
  for (const chunk of chunks) {
    for (const tx of chunk.filter((tx) => tx.functionName === "reveal")) {
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
  }

  return reveals;
}

/**
 * Fetch user usernames from votes for the given gravity poll.
 */
export async function fetchUsersFromVotes(artist: string, pollIds: number[]) {
  const rows = await db
    .selectDistinctOn([polygonVotes.address], { address: polygonVotes.address })
    .from(polygonVotes)
    .where(
      and(
        eq(polygonVotes.contract, ADDRESSES[artist]),
        inArray(polygonVotes.pollId, pollIds)
      )
    );

  if (rows.length === 0) {
    return {};
  }

  const cosmo = await db.query.cosmoAccounts.findMany({
    where: {
      polygonAddress: {
        in: rows.map((row) => row.address),
      },
    },
    columns: {
      username: true,
      polygonAddress: true,
    },
  });

  return cosmo
    .filter((c) => c.polygonAddress !== null)
    .reduce((acc, { polygonAddress, username }) => {
      acc[polygonAddress!.toLowerCase()] = username;
      return acc;
    }, {} as Record<string, string | undefined>);
}

const ADDRESSES: Record<string, Hex> = {
  triples: "0xc3e5ad11ae2f00c740e74b81f134426a3331d950",
  artms: "0x8466e6e218f0fe438ac8f403f684451d20e59ee3",
};

class GravityError extends Error {}
class GravityMissingError extends GravityError {
  message = "Gravity not found";
}
class BlockNumbersMissingError extends GravityError {
  message = "Failed to fetch block numbers";
}
