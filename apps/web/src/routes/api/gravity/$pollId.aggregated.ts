import { AggregatedGravityData } from "@/lib/client/gravity/abstract/types";
import { cacheHeaders } from "@/lib/server/cache";
import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { createFileRoute } from "@tanstack/react-router";
import { addMinutes, isPast, startOfHour } from "date-fns";

export const Route = createFileRoute("/api/gravity/$pollId/aggregated")({
  server: {
    handlers: {
      /**
       * API route that returns aggregated gravity vote data.
       * Returns chart data, top 50 votes, top 25 users, and reveals.
       */
      GET: async ({ params }) => {
        // validate pollId
        const pollId = Number(params.pollId);
        if (isNaN(pollId)) {
          return Response.json({ error: "Invalid poll ID" }, { status: 422 });
        }

        // fetch poll dates from database
        const poll = await db.query.gravityPolls.findFirst({
          where: { cosmoId: pollId },
          columns: { startDate: true, endDate: true },
        });
        if (!poll?.startDate || !poll?.endDate) {
          return Response.json({ error: "Poll not found" }, { status: 404 });
        }
        const startDate = poll.startDate.toISOString();
        const endDate = poll.endDate.toISOString();

        // fetch all votes from indexer
        const rawVotes = await indexer.query.votes.findMany({
          columns: {
            tokenId: false,
            pollId: false,
            logIndex: false,
            hash: false,
          },
          where: { pollId },
        });

        // compute aggregations in parallel
        const [chartData, topVotes, topUsers] = await Promise.all([
          computeChartData(rawVotes, startDate, endDate),
          computeTopVotes(rawVotes, 50),
          computeTopUsers(rawVotes, 25),
        ]);

        // count revealed votes
        const revealedVoteCount = rawVotes.filter(
          (v) => v.candidateId !== null,
        ).length;

        // sum como used
        const totalComoCount = rawVotes.reduce((acc, v) => acc + v.amount, 0);

        // only return reveals array if all votes are revealed (finalized)
        // otherwise client will poll for reveals
        const isFinalized = revealedVoteCount === rawVotes.length;
        const reveals = isFinalized
          ? rawVotes
              .filter((v) => v.candidateId !== null)
              .map((v) => ({
                id: v.id,
                candidateId: v.candidateId!,
                amount: v.amount,
              }))
          : [];

        // collect unique addresses from top votes and top users
        const addresses = new Set<string>();
        for (const vote of topVotes) {
          addresses.add(vote.voter);
        }
        for (const user of topUsers) {
          addresses.add(user.address);
        }

        // fetch usernames for those addresses only
        const addressMap = await fetchKnownAddresses([...addresses]);

        // map usernames onto results
        const topVotesWithUsernames = topVotes.map((vote) => ({
          ...vote,
          username: addressMap.get(vote.voter.toLowerCase())?.username,
        }));

        const topUsersWithUsernames = topUsers.map((user) => ({
          ...user,
          nickname: addressMap.get(user.address.toLowerCase())?.username,
        }));

        const cacheTime = isPast(endDate)
          ? 60 * 60 * 24 * 30 // 30 days if past
          : 60 * 10; // 10 minutes if not

        const result = {
          chartData,
          topVotes: topVotesWithUsernames,
          topUsers: topUsersWithUsernames,
          totalVoteCount: rawVotes.length,
          totalComoCount,
          revealedVoteCount,
          reveals,
        } satisfies AggregatedGravityData;

        return Response.json(result, {
          headers: cacheHeaders({ cdn: cacheTime }),
        });
      },
    },
  },
});

type RawVote = {
  id: string;
  from: string;
  createdAt: string;
  amount: number;
  blockNumber: number;
  candidateId: number | null;
};

/**
 * Compute chart data by grouping votes into 30-minute segments.
 */
function computeChartData(
  votes: RawVote[],
  startDate: string,
  endDate: string,
) {
  const startTime = new Date(startDate);
  const endTime = new Date(endDate);

  // generate 30-minute segments covering the full poll period
  const segmentMap = new Map<
    string,
    { timestamp: string; voteCount: number; totalTokenAmount: number }
  >();

  // start from the 30-minute segment containing the poll start
  const startHour = startOfHour(startTime);
  let currentTime =
    startTime.getMinutes() < 30 ? startHour : addMinutes(startHour, 30);

  while (currentTime < endTime) {
    segmentMap.set(currentTime.toISOString(), {
      timestamp: currentTime.toISOString(),
      voteCount: 0,
      totalTokenAmount: 0,
    });
    currentTime = addMinutes(currentTime, 30);
  }

  // populate segments with vote data
  for (const vote of votes) {
    const voteTime = new Date(vote.createdAt);
    const hour = startOfHour(voteTime);
    const segmentTime =
      voteTime.getMinutes() < 30 ? hour : addMinutes(hour, 30);

    const segment = segmentMap.get(segmentTime.toISOString());
    if (segment) {
      segment.voteCount += 1;
      segment.totalTokenAmount += vote.amount;
    }
  }

  // convert to sorted array
  return Array.from(segmentMap.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/**
 * Get top N votes sorted by amount descending.
 */
function computeTopVotes(votes: RawVote[], limit: number) {
  // sort by amount descending and take top N
  const sorted = [...votes].sort((a, b) => b.amount - a.amount);

  return sorted.slice(0, limit).map((vote) => ({
    id: vote.id,
    voter: vote.from,
    comoAmount: vote.amount,
    candidateId: vote.candidateId,
    blockNumber: vote.blockNumber,
  }));
}

type AggregatedUser = {
  address: string;
  total: number;
  votes: { id: string; candidateId: number | null; amount: number }[];
};

/**
 * Aggregate votes by user and return top N users by total COMO.
 */
function computeTopUsers(votes: RawVote[], limit: number) {
  // aggregate votes by user address
  const userMap = new Map<string, AggregatedUser>();

  for (const vote of votes) {
    const address = vote.from.toLowerCase();
    let user = userMap.get(address);

    if (!user) {
      user = {
        address,
        total: 0,
        votes: [],
      };
      userMap.set(address, user);
    }

    user.total += vote.amount;
    user.votes.push({
      id: vote.id,
      candidateId: vote.candidateId,
      amount: vote.amount,
    });
  }

  // use min-heap approach to find top N users
  const topUsersHeap: AggregatedUser[] = [];

  const maintainHeap = () => {
    topUsersHeap.sort((a, b) => a.total - b.total);
  };

  for (const user of userMap.values()) {
    if (topUsersHeap.length < limit) {
      topUsersHeap.push(user);
      maintainHeap();
    } else if (
      topUsersHeap[0] !== undefined &&
      user.total > topUsersHeap[0].total
    ) {
      topUsersHeap[0] = user;
      maintainHeap();
    }
  }

  // sort final result descending by total
  return topUsersHeap.sort((a, b) => b.total - a.total);
}
