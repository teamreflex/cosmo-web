import { sumComoPerCandidate } from "@/lib/client/gravity/reveals";
import type {
  AggregatedGravityData,
  CandidateSegments,
  ChartSegment,
  FinalizedReveals,
} from "@/lib/client/gravity/types";
import { $fetchArtists } from "@/lib/functions/artists";
import { addr, type Chain, chainAt } from "@apollo/util";
import { notFound } from "@tanstack/react-router";
import { addMinutes, startOfHour } from "date-fns";
import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { remember } from "./cache.server";
import { fetchKnownAddresses } from "./cosmo-accounts.server";
import { db } from "./db";
import { indexer } from "./db/indexer";
import { votes } from "./db/indexer/schema";

const TOP_VOTE_COUNT = 50;
const TOP_USER_COUNT = 25;

/**
 * A poll and the gravity it belongs to, enough to locate its votes.
 */
export type PollSource = {
  cosmoId: number;
  pollIdOnChain: number;
  startDate: Date;
  endDate: Date;
  gravity: {
    cosmoId: number;
    artist: string;
    endDate: Date;
  };
};

/**
 * Where a poll's votes are in the indexer's `vote` table. Poll ids restart
 * per chain, and on Polygon per artist, so all three are needed.
 */
export type IndexedPoll = {
  chain: Chain;
  /** the artist's COMO token id */
  tokenId: number;
  /** the poll's id on that chain */
  pollId: number;
};

/**
 * Votes and COMO for one candidate (or unrevealed votes) in one 30-minute bucket.
 */
type VoteRollup = {
  candidateId: number | null;
  /** Bucket start, epoch milliseconds */
  bucket: number;
  voteCount: number;
  como: number;
};

type TopVote = {
  id: string;
  voter: string;
  amount: number;
  candidateId: number | null;
  blockNumber: number;
};

type TopVoterVote = {
  id: string;
  address: string;
  amount: number;
  candidateId: number | null;
  /** ISO-8601, when the vote was cast */
  createdAt: string;
};

/**
 * Everything the aggregated endpoint needs from a poll's votes, computed in
 * the database so the result stays small however many votes the poll has.
 */
type PollVoteSummary = {
  rollup: VoteRollup[];
  /** Heaviest votes first, earliest first among equal amounts. */
  topVotes: TopVote[];
  /** Every vote cast by the heaviest voters, oldest first. */
  topVoterVotes: TopVoterVote[];
};

/**
 * Locate a poll's votes. COSMO doesn't say which chain a poll ran on, so it
 * follows from when the gravity ended.
 */
export async function indexedPoll(
  poll: Pick<PollSource, "cosmoId" | "pollIdOnChain" | "gravity">,
): Promise<IndexedPoll> {
  const { artists } = await $fetchArtists();
  const artist = artists[poll.gravity.artist.toLowerCase()];
  if (artist === undefined) {
    throw new Error(
      `No artist "${poll.gravity.artist}" for poll ${poll.cosmoId}`,
    );
  }

  const chain = chainAt(poll.gravity.endDate);
  return {
    chain,
    tokenId: artist.comoTokenId,
    pollId: chain === "polygon" ? polygonPollId(poll) : poll.cosmoId,
  };
}

/**
 * Locate a poll's votes from its cosmo id alone. A poll never moves, so the
 * answer is cached for the functions clients poll.
 */
export async function fetchIndexedPoll(cosmoPollId: number) {
  return await remember(
    `gravity-indexed-poll:v1:${cosmoPollId}`,
    60 * 60 * 24,
    async () => {
      const poll = await db.query.gravityPolls.findFirst({
        where: { cosmoId: cosmoPollId },
        columns: { cosmoId: true, pollIdOnChain: true },
        with: {
          gravity: {
            columns: { cosmoId: true, artist: true, endDate: true },
          },
        },
      });
      if (poll === undefined) {
        throw notFound();
      }

      return await indexedPoll(poll);
    },
  );
}

/**
 * Aggregate a poll's votes into chart segments, top votes, top voters and,
 * once every vote is revealed, per-candidate totals.
 */
export async function fetchAggregatedGravityData(
  poll: PollSource,
): Promise<AggregatedGravityData> {
  const summarize = async () => summarizeIndexedPoll(await indexedPoll(poll));
  // a Polygon poll never changes, so its summary is shared across every edge and SSR render
  const summary =
    chainAt(poll.gravity.endDate) === "polygon"
      ? await remember(
          `polygon-poll-summary:v2:${poll.cosmoId}`,
          60 * 60 * 24 * 30,
          summarize,
        )
      : await summarize();

  const chartData = chartSegments(poll.startDate, poll.endDate);
  const segmentIndexes = new Map(
    chartData.map((segment, index) => [Date.parse(segment.timestamp), index]),
  );

  let totalVoteCount = 0;
  let totalComoCount = 0;
  let revealedVoteCount = 0;
  for (const row of summary.rollup) {
    totalVoteCount += row.voteCount;
    totalComoCount += row.como;
    if (row.candidateId !== null) {
      revealedVoteCount += row.voteCount;
    }

    // votes outside the poll window count toward totals but not the chart
    const index = segmentIndexes.get(row.bucket);
    const segment = index === undefined ? undefined : chartData[index];
    if (segment !== undefined) {
      segment.voteCount += row.voteCount;
      segment.totalTokenAmount += row.como;
    }
  }

  const finalized =
    revealedVoteCount > 0 && revealedVoteCount === totalVoteCount
      ? summarizeReveals(summary.rollup, segmentIndexes, chartData.length)
      : null;

  const topUsers = groupTopUsers(summary.topVoterVotes);

  // collect unique addresses from top votes and top users
  const addresses = new Set<string>();
  for (const vote of summary.topVotes) {
    addresses.add(addr(vote.voter));
  }
  for (const user of topUsers) {
    addresses.add(user.address);
  }

  // fetch usernames for those addresses only
  const addressMap = await fetchKnownAddresses(Array.from(addresses));

  return {
    chartData,
    topVotes: summary.topVotes.map((vote) => ({
      id: vote.id,
      voter: vote.voter,
      comoAmount: vote.amount,
      candidateId: vote.candidateId,
      blockNumber: vote.blockNumber,
      username: addressMap.get(addr(vote.voter))?.username,
    })),
    topUsers: topUsers.map((user) => ({
      ...user,
      nickname: addressMap.get(user.address)?.username,
    })),
    totalVoteCount,
    totalComoCount,
    revealedVoteCount,
    finalized,
    startDate: poll.startDate.toISOString(),
    endDate: poll.endDate.toISOString(),
  };
}

/**
 * Summarize a poll from the indexer.
 */
async function summarizeIndexedPoll(
  poll: IndexedPoll,
): Promise<PollVoteSummary> {
  const bucket =
    sql<number>`(extract(epoch from date_bin('30 minutes', ${votes.createdAt}, timestamptz '2000-01-01')) * 1000)::bigint`.mapWith(
      Number,
    );
  const como = sql<number>`sum(${votes.amount})::bigint`.mapWith(Number);
  /**
   * A few Polygon votes were never revealed on-chain. Polygon polls are
   * finished, so counting them would read as a poll still being revealed.
   */
  const inPoll = and(
    eq(votes.chain, poll.chain),
    eq(votes.tokenId, poll.tokenId),
    eq(votes.pollId, poll.pollId),
    poll.chain === "polygon" ? isNotNull(votes.candidateId) : undefined,
  );

  // one snapshot, so a response built as the last reveal lands can't pair
  // finalized totals with unrevealed top votes
  return await indexer.transaction(
    async (tx) => {
      const rollup = await tx
        .select({
          candidateId: votes.candidateId,
          bucket,
          voteCount: count(),
          como,
        })
        .from(votes)
        .where(inPoll)
        .groupBy(votes.candidateId, bucket);

      const topVotes = await tx
        .select({
          id: votes.id,
          voter: votes.from,
          amount: votes.amount,
          candidateId: votes.candidateId,
          blockNumber: votes.blockNumber,
        })
        .from(votes)
        .where(inPoll)
        .orderBy(
          desc(votes.amount),
          asc(votes.blockNumber),
          asc(votes.logIndex),
          asc(votes.id),
        )
        .limit(TOP_VOTE_COUNT);

      const topVoters = tx
        .select({ address: votes.from })
        .from(votes)
        .where(inPoll)
        .groupBy(votes.from)
        .orderBy(desc(como), asc(votes.from))
        .limit(TOP_USER_COUNT)
        .as("top_voters");

      const topVoterVotes = await tx
        .select({
          id: votes.id,
          address: votes.from,
          amount: votes.amount,
          candidateId: votes.candidateId,
          createdAt: votes.createdAt,
        })
        .from(votes)
        .innerJoin(topVoters, eq(votes.from, topVoters.address))
        .where(inPoll)
        .orderBy(asc(votes.blockNumber), asc(votes.logIndex), asc(votes.id));

      return {
        rollup,
        topVotes,
        topVoterVotes: topVoterVotes.map((vote) => ({
          ...vote,
          createdAt: new Date(vote.createdAt).toISOString(),
        })),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

/**
 * Empty 30-minute segments covering the whole poll, starting from the
 * segment containing the poll start.
 */
function chartSegments(startDate: Date, endDate: Date): ChartSegment[] {
  const segments: ChartSegment[] = [];

  const startHour = startOfHour(startDate);
  let currentTime =
    startDate.getMinutes() < 30 ? startHour : addMinutes(startHour, 30);

  while (currentTime < endDate) {
    segments.push({
      timestamp: currentTime.toISOString(),
      voteCount: 0,
      totalTokenAmount: 0,
    });
    currentTime = addMinutes(currentTime, 30);
  }

  return segments;
}

/**
 * Final COMO per candidate, overall and per chart segment.
 */
function summarizeReveals(
  rollup: VoteRollup[],
  segmentIndexes: Map<number, number>,
  segmentCount: number,
): FinalizedReveals {
  const revealed = rollup.flatMap((row) =>
    row.candidateId === null ? [] : [{ ...row, candidateId: row.candidateId }],
  );

  const segments = new Map<number, number[]>();
  for (const row of revealed) {
    const index = segmentIndexes.get(row.bucket);
    if (index === undefined) continue;

    let amounts = segments.get(row.candidateId);
    if (amounts === undefined) {
      amounts = Array.from({ length: segmentCount }, () => 0);
      segments.set(row.candidateId, amounts);
    }
    amounts[index] = (amounts[index] ?? 0) + row.como;
  }

  return {
    comoPerCandidate: sumComoPerCandidate(
      revealed.map((row) => ({
        candidateId: row.candidateId,
        amount: row.como,
      })),
    ),
    segments: Array.from(
      segments,
      ([candidateId, amounts]): CandidateSegments => ({ candidateId, amounts }),
    ).sort((a, b) => a.candidateId - b.candidateId),
  };
}

/**
 * Group the top voters' votes by voter, heaviest voter first.
 */
function groupTopUsers(votes: TopVoterVote[]) {
  const users = new Map<
    string,
    { address: string; total: number; votes: Omit<TopVoterVote, "address">[] }
  >();

  for (const { address: rawAddress, ...vote } of votes) {
    const address = addr(rawAddress);
    let user = users.get(address);
    if (user === undefined) {
      user = { address, total: 0, votes: [] };
      users.set(address, user);
    }

    user.total += vote.amount;
    user.votes.push(vote);
  }

  return Array.from(users.values()).sort(
    (a, b) =>
      b.total - a.total ||
      (a.address < b.address ? -1 : a.address > b.address ? 1 : 0),
  );
}

/**
 * On-chain poll id for a Polygon poll. `pollIdOnChain` only became meaningful
 * once COSMO stopped reusing the cosmo poll id on-chain, after gravity 11.
 * The polls of gravity 2 sit one behind their cosmo ids.
 */
function polygonPollId(
  poll: Pick<PollSource, "cosmoId" | "pollIdOnChain" | "gravity">,
) {
  if (poll.gravity.cosmoId === 2) {
    return poll.cosmoId - 1;
  }

  return poll.gravity.cosmoId <= 11 ? poll.cosmoId : poll.pollIdOnChain;
}
