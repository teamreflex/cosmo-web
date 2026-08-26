import type {
  CosmoGravity,
  CosmoPollChoices,
  CosmoPollFinalized,
  CosmoPollUpcoming,
  PollSelectedContentImage,
} from "@apollo/cosmo/types/gravity";

export type PollStatus = "upcoming" | "ongoing" | "finalized" | "counting";

/**
 * Determines the status of a gravity poll.
 */
export function getPollStatus(
  poll: CosmoPollChoices | CosmoPollUpcoming | CosmoPollFinalized,
): PollStatus {
  const now = new Date();

  // COSMO flips finalized to true as soon as voting ends, so the reveal date is what separates counting from finalized
  if (new Date(poll.endDate) <= now) {
    return new Date(poll.revealDate) <= now ? "finalized" : "counting";
  }

  if (new Date(poll.startDate) >= now) {
    return "upcoming";
  }

  return "ongoing";
}

/**
 * Candidate display content for a poll, in on-chain candidate order.
 * Single polls provide it directly; combination polls (the 2022-2023 grand
 * gravities) use slot-based view metadata instead, so their candidate content
 * is derived from the choices.
 */
export function pollCandidates(
  poll: CosmoPollChoices,
): PollSelectedContentImage[] {
  if (poll.type === "single-poll") {
    return poll.pollViewMetadata.selectedContent;
  }

  // untitled 2022 choices label themselves by id (e.g. "S2+S6")
  return poll.choices.map((choice) => ({
    choiceId: choice.id,
    content: {
      type: "image",
      imageUrl: choice.txImageUrl,
      title: "title" in choice ? choice.title : choice.id,
      description: "description" in choice ? choice.description : "",
    },
  }));
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
