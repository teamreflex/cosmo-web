import { GravityResult, PollResult } from "../universal/votes";
import { POLYGON_DECIMALS } from "./como";
import { db } from "./db";
import { indexer } from "./db/indexer";

/**
 * Fetches the votes for a user.
 */
export async function fetchUserVotes(address: string) {
  const votes = await indexer.query.votes.findMany({
    where: (table, { eq }) => eq(table.from, address.toLowerCase()),
  });

  const uniquePollIds = [...new Set(votes.map((v) => v.pollId))];
  const polls = await db.query.gravityPolls.findMany({
    where: (table, { inArray }) =>
      inArray(table.pollIdOnChain, Array.from(uniquePollIds)),
    with: {
      gravity: true,
      candidates: true,
    },
  });

  return polls.reduce((acc, poll) => {
    // get votes for this poll
    const pollVotes = votes
      .filter((v) => v.pollId === poll.pollIdOnChain)
      .map((vote) => ({
        id: vote.id,
        createdAt: new Date(vote.createdAt),
        amount: vote.amount / 10 ** POLYGON_DECIMALS,
        candidate: poll.candidates.find(
          (c) => c.candidateId === vote.candidateId
        )?.title,
      }));

    const pollResult = {
      ...poll,
      votes: pollVotes,
    } satisfies PollResult;

    // add the gravity and/or poll
    const index = acc.findIndex((g) => g.id === poll.gravity.id);
    if (index === -1) {
      acc.push({
        ...poll.gravity,
        polls: [pollResult],
      });
    } else {
      acc[index].polls.push(pollResult);
    }

    return acc;
  }, [] as GravityResult[]);
}
