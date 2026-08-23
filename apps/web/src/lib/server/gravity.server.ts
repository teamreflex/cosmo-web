import { isBefore } from "date-fns";
import { db } from "./db";
import { indexer } from "./db/indexer";

/**
 * COSMO moved gravity voting from Polygon to Abstract on this date. Votes for
 * everything before it live in the `polygon_votes` archive, everything after
 * in the indexer.
 */
const ABSTRACT_MIGRATION_DATE = "2025-04-18";

/**
 * Polygon governor contract per artist. Polygon poll ids restart per contract,
 * so both are needed to identify a poll.
 */
const POLYGON_CONTRACTS = new Map([
  ["triples", "0xc3e5ad11ae2f00c740e74b81f134426a3331d950"],
  ["artms", "0x8466e6e218f0fe438ac8f403f684451d20e59ee3"],
]);

/**
 * A poll and the gravity it belongs to, enough to locate its votes.
 */
export type PollSource = {
  cosmoId: number;
  pollIdOnChain: number;
  gravity: {
    cosmoId: number;
    artist: string;
    endDate: Date;
  };
};

/**
 * A vote in the shape the aggregation helpers consume, regardless of era.
 */
export type PollVote = {
  id: string;
  from: string;
  /** ISO-8601, when the vote was cast */
  createdAt: string;
  amount: number;
  blockNumber: number;
  candidateId: number | null;
};

/**
 * Whether a gravity ran on Polygon, based on when it ended.
 */
export function isPolygonGravity(gravityEndDate: Date) {
  return isBefore(gravityEndDate, ABSTRACT_MIGRATION_DATE);
}

/**
 * Fetch every vote cast in a poll from whichever era it belongs to.
 */
export async function fetchPollVotes(poll: PollSource): Promise<PollVote[]> {
  if (!isPolygonGravity(poll.gravity.endDate)) {
    // on abstract the on-chain poll id is the cosmo poll id
    const votes = await indexer.query.votes.findMany({
      columns: {
        id: true,
        from: true,
        createdAt: true,
        amount: true,
        blockNumber: true,
        candidateId: true,
      },
      where: { pollId: poll.cosmoId },
    });

    return votes.map((vote) => ({
      ...vote,
      createdAt: toIso(vote.createdAt),
    }));
  }

  const contract = POLYGON_CONTRACTS.get(poll.gravity.artist.toLowerCase());
  if (contract === undefined) {
    throw new Error(
      `No polygon contract for artist "${poll.gravity.artist}" (poll ${poll.cosmoId})`,
    );
  }

  const votes = await db.query.polygonVotes.findMany({
    columns: {
      id: true,
      address: true,
      createdAt: true,
      amount: true,
      blockNumber: true,
      candidateId: true,
    },
    where: {
      contract,
      pollId: polygonPollId(poll),
    },
  });

  return votes.map((vote) => ({
    id: vote.id.toString(),
    from: vote.address,
    createdAt: vote.createdAt.toISOString(),
    amount: vote.amount,
    blockNumber: vote.blockNumber,
    candidateId: vote.candidateId,
  }));
}

/**
 * Indexer timestamps come back as postgres strings, which not every browser
 * parses. Everything crossing to the client is ISO-8601.
 */
export function toIso(timestamp: string) {
  return new Date(timestamp).toISOString();
}

/**
 * On-chain poll id for a Polygon poll. `pollIdOnChain` only became meaningful
 * once COSMO stopped reusing the cosmo poll id on-chain, after gravity 11.
 * The polls of gravity 2 sit one behind their cosmo ids.
 */
function polygonPollId(poll: PollSource) {
  if (poll.gravity.cosmoId === 2) {
    return poll.cosmoId - 1;
  }

  return poll.gravity.cosmoId <= 11 ? poll.cosmoId : poll.pollIdOnChain;
}
