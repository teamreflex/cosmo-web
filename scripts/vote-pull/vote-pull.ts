import { indexer } from "@/lib/server/db/indexer";
import { db } from "@/lib/server/db";

/**
 * Pull the top 25 votes from the given poll.
 */

const POLL_ID = 108;

const top10votes = await indexer.query.votes.findMany({
  where: (t, { eq }) => eq(t.pollId, POLL_ID),
  orderBy: (t, { desc }) => desc(t.amount),
  limit: 25,
});

const addresses = new Set(top10votes.map(({ from }) => from));

const users = await db.query.profiles.findMany({
  where: (t, { inArray }) => inArray(t.userAddress, Array.from(addresses)),
});

const mappedVotes = top10votes.map((vote) => {
  const user = users.find(
    (u) => u.userAddress.toLowerCase() === vote.from.toLowerCase()
  );
  return [user?.nickname, Math.floor(vote.amount / 10 ** 18)];
});

console.table(mappedVotes);
