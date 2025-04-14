import {
  CosmoGravity,
  CosmoPollChoices,
  CosmoPollFinalized,
  CosmoPollUpcoming,
} from "@/lib/universal/cosmo/gravity";

// Alchemy only allows fetching 2000 blocks at a time
const MAX_BLOCK_RANGE = 2000;

type BlockChunkParams<T> = {
  start: number;
  end: number | null;
  current: number;
  cb: (params: { fromBlock: number; toBlock: number }) => Promise<T>;
};

/**
 * Fetch data in chunks of 2000 blocks, returning the full list of data.
 */
export async function chunkBlocks<T>({
  start,
  end,
  current,
  cb,
}: BlockChunkParams<T>) {
  // if endBlock is not null, use it as the stopping point instead of currentBlock
  const stopBlock = end !== null ? end : current;

  const list: Promise<T>[] = [];
  for (
    let fromBlock = start;
    fromBlock <= stopBlock;
    fromBlock += MAX_BLOCK_RANGE
  ) {
    const toBlock = Math.min(fromBlock + MAX_BLOCK_RANGE - 1, stopBlock);
    list.push(cb({ fromBlock, toBlock }));
  }

  return await Promise.all(list);
}

type PollStatus = "upcoming" | "ongoing" | "finalized" | "counting";

/**
 * Determines the status of a gravity poll.
 */
export function getPollStatus(
  poll: CosmoPollChoices | CosmoPollUpcoming | CosmoPollFinalized
): PollStatus {
  const now = new Date();

  if (new Date(poll.endDate) <= now) {
    return poll.finalized ? "finalized" : "counting";
  }

  if (new Date(poll.startDate) >= now) {
    return "upcoming";
  }

  return "ongoing";
}

/**
 * Get the first chartable poll with first poll as fallback.
 */
export function findPoll(gravity: CosmoGravity) {
  const polls = gravity.polls.map((poll, index) => ({
    poll,
    status: getPollStatus(poll),
    index,
  }));

  return (
    polls.find((poll) => ["counting", "finalized"].includes(poll.status)) ??
    polls[0]
  );
}
