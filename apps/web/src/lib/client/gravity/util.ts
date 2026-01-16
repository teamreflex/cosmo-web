import type {
  CosmoGravity,
  CosmoPollChoices,
  CosmoPollFinalized,
  CosmoPollUpcoming,
} from "@apollo/cosmo/types/gravity";

type PollStatus = "upcoming" | "ongoing" | "finalized" | "counting";

/**
 * Determines the status of a gravity poll.
 */
function getPollStatus(
  poll: CosmoPollChoices | CosmoPollUpcoming | CosmoPollFinalized,
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
