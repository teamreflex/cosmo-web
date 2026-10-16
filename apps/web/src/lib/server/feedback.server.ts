import { userFeedbackStats } from "@apollo/database/web/schema";
import type { FeedbackRating } from "@apollo/database/web/types";
import { sql } from "drizzle-orm";
import { ExpectedError } from "../universal/errors/expected";
import type { FeedbackErrorCode } from "../universal/errors/feedback";
import type { WebTx } from "./db";

// the stats columns a badge reads, nested into the query it rides on
export const feedbackRepColumns = {
  positive: true,
  neutral: true,
  negative: true,
  percentPositive: true,
} as const;

export function refuseFeedback(code: FeedbackErrorCode): never {
  throw new ExpectedError(code);
}

/**
 * Adds a scored rating to its address's stats, or takes one away with
 * `by: -1` when a moderator removes it, inserting the row on the address's
 * first scored rating. One atomic upsert, so concurrent ratings of the same
 * address queue on its row rather than overwrite each other. The inserted
 * row never holds the -1, since Postgres checks the `>= 0` constraints on it
 * before it finds the conflict.
 */
export async function addFeedbackStats(
  tx: WebTx,
  {
    address,
    rating,
    by,
  }: { address: string; rating: FeedbackRating; by: 1 | -1 },
) {
  const delta = (column: FeedbackRating) => (column === rating ? by : 0);
  const add = (column: FeedbackRating) =>
    sql`${userFeedbackStats[column]} + ${delta(column)}`;
  await tx
    .insert(userFeedbackStats)
    .values({
      address,
      positive: Math.max(delta("positive"), 0),
      neutral: Math.max(delta("neutral"), 0),
      negative: Math.max(delta("negative"), 0),
    })
    .onConflictDoUpdate({
      target: userFeedbackStats.address,
      set: {
        positive: add("positive"),
        neutral: add("neutral"),
        negative: add("negative"),
      },
    });
}
