import { sumComoPerCandidate } from "@/lib/client/gravity/reveals";
import type {
  AggregatedGravityData,
  CandidateSegments,
  ChartSegment,
  FinalizedReveals,
} from "@/lib/client/gravity/types";
import { polygonVotes } from "@apollo/database/web/schema";
import { addr } from "@apollo/util";
import { addMinutes, isBefore, startOfHour } from "date-fns";
import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import {
  fetchKnownAddresses,
  fetchKnownPolygonAddresses,
} from "./cosmo-accounts.server";
import { db } from "./db";
import { indexer } from "./db/indexer";
import { votes } from "./db/indexer/schema";

/**
 * COSMO moved gravity voting from Polygon to Abstract on this date. Votes for
 * everything before it live in the `polygon_votes` archive, everything after in the indexer.
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
 * Whether a gravity ran on Polygon, based on when it ended.
 */
export function isPolygonGravity(gravityEndDate: Date) {
  return isBefore(gravityEndDate, ABSTRACT_MIGRATION_DATE);
}

/**
 * Aggregate a poll's votes into chart segments, top votes, top voters and,
 * once every vote is revealed, per-candidate totals.
 */
export async function fetchAggregatedGravityData(
  poll: PollSource,
): Promise<AggregatedGravityData> {
  const isPolygon = isPolygonGravity(poll.gravity.endDate);
  const summary = isPolygon
    ? await summarizePolygonPoll(poll)
    : await summarizeAbstractPoll(poll.cosmoId);

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
  const addressMap = isPolygon
    ? await fetchKnownPolygonAddresses(Array.from(addresses))
    : await fetchKnownAddresses(Array.from(addresses));

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
 * Summarize an Abstract poll from the indexer, where the on-chain poll id is
 * the cosmo poll id.
 */
async function summarizeAbstractPoll(pollId: number): Promise<PollVoteSummary> {
  const bucket =
    sql<number>`(extract(epoch from date_bin('30 minutes', ${votes.createdAt}, timestamptz '2000-01-01')) * 1000)::bigint`.mapWith(
      Number,
    );
  const como = sql<number>`sum(${votes.amount})::bigint`.mapWith(Number);
  const inPoll = eq(votes.pollId, pollId);

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
 * Summarize a Polygon poll from the web database archive.
 */
async function summarizePolygonPoll(
  poll: PollSource,
): Promise<PollVoteSummary> {
  const contract = POLYGON_CONTRACTS.get(poll.gravity.artist.toLowerCase());
  if (contract === undefined) {
    throw new Error(
      `No polygon contract for artist "${poll.gravity.artist}" (poll ${poll.cosmoId})`,
    );
  }

  const bucket =
    sql<number>`(extract(epoch from date_bin('30 minutes', ${polygonVotes.createdAt}, timestamp '2000-01-01')) * 1000)::bigint`.mapWith(
      Number,
    );
  const como = sql<number>`sum(${polygonVotes.amount})::bigint`.mapWith(Number);

  // a handful of archive rows were never revealed on-chain; polygon polls are
  // immutably finalized, so keeping them would read as a poll still counting
  const inPoll = and(
    eq(polygonVotes.contract, contract),
    eq(polygonVotes.pollId, polygonPollId(poll)),
    isNotNull(polygonVotes.candidateId),
  );

  const topVoters = db
    .select({ address: polygonVotes.address })
    .from(polygonVotes)
    .where(inPoll)
    .groupBy(polygonVotes.address)
    .orderBy(desc(como), asc(polygonVotes.address))
    .limit(TOP_USER_COUNT)
    .as("top_voters");

  // the archive never changes, so separate snapshots can't disagree
  const [rollup, topVotes, topVoterVotes] = await Promise.all([
    db
      .select({
        candidateId: polygonVotes.candidateId,
        bucket,
        voteCount: count(),
        como,
      })
      .from(polygonVotes)
      .where(inPoll)
      .groupBy(polygonVotes.candidateId, bucket),
    db
      .select({
        id: polygonVotes.id,
        voter: polygonVotes.address,
        amount: polygonVotes.amount,
        candidateId: polygonVotes.candidateId,
        blockNumber: polygonVotes.blockNumber,
      })
      .from(polygonVotes)
      .where(inPoll)
      .orderBy(
        desc(polygonVotes.amount),
        asc(polygonVotes.blockNumber),
        asc(polygonVotes.index),
        asc(polygonVotes.id),
      )
      .limit(TOP_VOTE_COUNT),
    db
      .select({
        id: polygonVotes.id,
        address: polygonVotes.address,
        amount: polygonVotes.amount,
        candidateId: polygonVotes.candidateId,
        createdAt: polygonVotes.createdAt,
      })
      .from(polygonVotes)
      .innerJoin(topVoters, eq(polygonVotes.address, topVoters.address))
      .where(inPoll)
      .orderBy(
        asc(polygonVotes.blockNumber),
        asc(polygonVotes.index),
        asc(polygonVotes.id),
      ),
  ]);

  return {
    rollup,
    topVotes: topVotes.map((vote) => ({ ...vote, id: vote.id.toString() })),
    topVoterVotes: topVoterVotes.map((vote) => ({
      ...vote,
      id: vote.id.toString(),
      createdAt: vote.createdAt.toISOString(),
    })),
  };
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
function polygonPollId(poll: PollSource) {
  if (poll.gravity.cosmoId === 2) {
    return poll.cosmoId - 1;
  }

  return poll.gravity.cosmoId <= 11 ? poll.cosmoId : poll.pollIdOnChain;
}
