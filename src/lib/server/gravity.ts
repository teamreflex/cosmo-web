import { and, eq } from "drizzle-orm";
import { indexer } from "./db/indexer";
import { votes } from "./db/indexer/schema";
import { db } from "./db";

type FetchUsersFromVotesParams = {
  contract: string;
  pollIdOnChain: number;
};

/**
 * Fetch user nicknames from votes for the given gravity poll.
 */
export async function fetchUsersFromVotes(params: FetchUsersFromVotesParams) {
  const rows = await indexer
    .selectDistinctOn([votes.from], { from: votes.from })
    .from(votes)
    .where(
      and(
        eq(votes.contract, params.contract.toLowerCase()),
        eq(votes.pollId, params.pollIdOnChain)
      )
    );

  if (rows.length === 0) {
    return [];
  }

  const profiles = await db.query.profiles.findMany({
    where: {
      userAddress: {
        in: rows.map((row) => row.from),
      },
    },
    columns: {
      nickname: true,
      userAddress: true,
    },
  });

  return profiles.reduce((acc, { userAddress, nickname }) => {
    acc[userAddress.toLowerCase()] = nickname;
    return acc;
  }, {} as Record<string, string | undefined>);
}
