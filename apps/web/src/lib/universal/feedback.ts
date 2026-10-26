import { sanitizeMessage } from "@apollo/chat/sanitize";
import {
  type EndedTradeStatus,
  type FeedbackRating,
  type FeedbackRole,
  feedbackRatings,
  feedbackRoles,
  type TradeFeedback,
  type TradeSide,
  type UserFeedbackStats,
} from "@apollo/database/web/types";
import { feedbackOpening } from "@apollo/trades/feedback";
import type { TradeState } from "@apollo/trades/lifecycle";
import * as z from "zod";
import type { TradePartyName } from "./trades";

// the longest a comment may be, in code points as varchar(280) counts
export const FEEDBACK_TEXT_MAX = 280;

/**
 * Feedback text as it is stored: sanitized as chat sanitizes it, so text
 * that shows nothing is empty, then every run of whitespace, newlines
 * included, collapsed to one space, so an entry always reads as one line.
 */
export function normalizeFeedbackText(text: string) {
  return sanitizeMessage(text).replaceAll(/\s+/gu, " ").trim();
}

/**
 * A user's received feedback as badges show it: how many scored ratings are
 * visible, and the share of them that were positive (null with none but
 * neutrals).
 */
export type FeedbackRep = {
  count: number;
  percent: number | null;
};

/**
 * An address's stats row as badges read it, or null when it has no scored
 * rating, so a badge shows nothing rather than "0%".
 */
export function toFeedbackRep(
  stats: Pick<
    UserFeedbackStats,
    "positive" | "neutral" | "negative" | "percentPositive"
  > | null,
): FeedbackRep | null {
  if (stats === null) return null;
  const count = stats.positive + stats.neutral + stats.negative;
  return count === 0 ? null : { count, percent: stats.percentPositive };
}

/**
 * A share positive as a percent in the given locale, cut (never rounded) to
 * one decimal, or to a whole percent, so only all positive reads "100%" and
 * 999 of 1000 reads "99.9%", or "99%". Rounding to nine places first drops
 * the float error of the division, which could otherwise cut 29% to 28.9%.
 */
export function formatPercentPositive(
  percent: number,
  locale: string,
  digits: 0 | 1 = 1,
) {
  const permille = Math.floor(Math.round(percent * 1e9) / 1e6);
  const step = digits === 1 ? 1 : 10;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: permille === 1000 ? 0 : digits,
    maximumFractionDigits: permille === 1000 ? 0 : digits,
  }).format((Math.floor(permille / step) * step) / 1000);
}

/**
 * A rating as a party of its trade reads it. `removed` says a moderator
 * removed the rating, which only its rater still sees.
 */
export type FeedbackEntryView = {
  id: string;
  rating: FeedbackRating;
  comment: string | null;
  communication: number | null;
  speed: number | null;
  createdAt: Date;
  removed: boolean;
};

/**
 * Where a trade's feedback stands for one of its parties. A rating shows the
 * moment it's left.
 * - `ineligible`: the trade can't be rated.
 * - `none`: the viewer is staff, or the counterparty's account is gone
 *   before anyone rated.
 * - `open`: the viewer may rate until `closesAt`, with how and when the
 *   trade ended. `theirs` is the other party's rating, if they rated.
 * - `shown`: the viewer can't rate any more, and at least one rating shows.
 * - `closed`: the window closed with neither party rating.
 */
export type TradeFeedbackView =
  | { state: "ineligible" }
  | { state: "none" }
  | {
      state: "open";
      ended: EndedTradeStatus;
      endedAt: Date;
      closesAt: Date;
      theirs: FeedbackEntryView | null;
    }
  | {
      state: "shown";
      mine: FeedbackEntryView | null;
      theirs: FeedbackEntryView | null;
    }
  | { state: "closed"; closedAt: Date };

/**
 * A trade's ratings as its reader may load them: the viewer's own, and the
 * other party's while no moderator removed it.
 */
export type VisibleFeedbackRow = Pick<
  TradeFeedback,
  | "id"
  | "raterSide"
  | "rating"
  | "comment"
  | "communication"
  | "speed"
  | "createdAt"
  | "removedAt"
>;

function toFeedbackEntry(row: VisibleFeedbackRow): FeedbackEntryView {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    communication: row.communication,
    speed: row.speed,
    createdAt: row.createdAt,
    removed: row.removedAt !== null,
  };
}

/**
 * Where a trade's feedback stands for the party on `side`, at the database's
 * `now`. `rows` are the ratings the party may load.
 */
export function tradeFeedbackView({
  state,
  side,
  endedAt,
  now,
  rows,
  counterpartExists,
}: {
  state: TradeState;
  side: TradeSide;
  endedAt: Date | null;
  now: Date;
  rows: readonly VisibleFeedbackRow[];
  counterpartExists: boolean;
}): TradeFeedbackView {
  const opening = feedbackOpening({ state, endedAt, now, counterpartExists });
  if (opening.status === "ineligible") return { state: "ineligible" };
  const mineRow = rows.find((row) => row.raterSide === side);
  const theirsRow = rows.find(
    (row) => row.raterSide !== side && row.removedAt === null,
  );
  const mine = mineRow === undefined ? null : toFeedbackEntry(mineRow);
  const theirs = theirsRow === undefined ? null : toFeedbackEntry(theirsRow);

  if (mine === null && opening.status === "open") {
    return {
      state: "open",
      ended: opening.ended,
      endedAt: opening.endedAt,
      closesAt: opening.closesAt,
      theirs,
    };
  }
  if (mine !== null || theirs !== null) return { state: "shown", mine, theirs };
  return opening.status === "closed"
    ? { state: "closed", closedAt: opening.closedAt }
    : { state: "none" };
}

// the role tabs of the feedback page, by the rated party's role
export const feedbackRoleFilters = ["all", ...feedbackRoles] as const;
export type FeedbackRoleFilter = (typeof feedbackRoleFilters)[number];

export const feedbackRatingFilters = ["all", ...feedbackRatings] as const;
export type FeedbackRatingFilter = (typeof feedbackRatingFilters)[number];

/**
 * The feedback page's filters. A value the page doesn't know reads as all,
 * so an old or mistyped link still opens the page.
 */
export const feedbackSearchSchema = z.object({
  role: z.enum(feedbackRoleFilters).default("all").catch("all"),
  rating: z.enum(feedbackRatingFilters).default("all").catch("all"),
});

export type FeedbackSearch = z.infer<typeof feedbackSearchSchema>;

export const feedbackSearchDefaults = {
  role: "all",
  rating: "all",
} satisfies FeedbackSearch;

/**
 * An address's received feedback as its feedback page shows it. `total` and
 * `counts` are its visible ratings, scored or not; `score` and `percent`
 * follow the scored ones alone. Each average is null until enough starred
 * ratings back it. `roles` counts the visible ratings by the role the
 * address was rated in.
 */
export type FeedbackSummary = {
  total: number;
  score: number;
  percent: number | null;
  counts: Record<FeedbackRating, number>;
  communication: { average: number | null; count: number };
  speed: { average: number | null; count: number };
  roles: Record<FeedbackRole, number>;
};

/**
 * A visible rating on the feedback page. `role` is the rated party's.
 * `rater` is named as a trade names its parties, with their own feedback
 * score, null once their account is gone. `scored` says whether the rating
 * counts towards the profile's score. `listingId` is the listing the trade
 * came from, null when it didn't come from one.
 */
export type FeedbackProfileEntry = {
  id: string;
  rating: FeedbackRating;
  comment: string | null;
  communication: number | null;
  speed: number | null;
  role: FeedbackRole;
  scored: boolean;
  createdAt: Date;
  rater: TradePartyName & { score: number | null };
  ratedUserId: string | null;
  listingId: string | null;
};

export type FeedbackEntriesPage = {
  rows: FeedbackProfileEntry[];
  nextCursor: string | undefined;
};
