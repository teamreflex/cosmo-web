import type {
  EndedTradeStatus,
  FeedbackRole,
  TradeSide,
} from "@apollo/database/web/types";
import { isDone, type TradeItemState, type TradeState } from "./lifecycle";
import { FEEDBACK_WINDOW_DAYS } from "./timers";

const DAY = 24 * 60 * 60 * 1000;

/**
 * How a trade its parties may rate ended, or null when they may not, so
 * ratings show who let a trade lapse. A completed or timed-out trade always
 * may be rated, as may one staff cancelled, since staff usually end a
 * dispute against a silent party that way. A party may only cancel before
 * anything is sent, so their cancel can't be rated, and a disputed trade
 * waits for staff to end it.
 */
function rateableEnding(state: TradeState): EndedTradeStatus | null {
  switch (state.status) {
    case "completed":
    case "timed_out":
      return state.status;
    case "cancelled":
      return state.cancelledBy === "staff" ? state.status : null;
    case "disputed":
    case "pending":
    case "accepted":
    case "declined":
    case "withdrawn":
    case "countered":
    case "expired":
    case "stale":
      return null;
  }
}

/**
 * Whether a rating counts towards the rated party's score, share positive,
 * counts and claim cap. A completed trade's always does, including one staff
 * completed without seeing a transfer; any other only once a token arrived
 * or a payment was confirmed, since a payment marked paid doesn't count. A
 * rating that doesn't count still shows.
 */
export function feedbackScored(state: TradeState): boolean {
  return state.status === "completed" || state.items.some(isDone);
}

/**
 * Whether one party of a trade may rate the other now. The window to rate
 * stays open until 30 days after the trade ended, and while it's open a
 * counterparty whose account is gone can't be rated. An open window says how
 * and when the trade ended.
 */
export type FeedbackOpening =
  | { status: "ineligible" }
  | { status: "counterpart_gone" }
  | { status: "open"; ended: EndedTradeStatus; endedAt: Date; closesAt: Date }
  | { status: "closed"; closedAt: Date };

export function feedbackOpening({
  state,
  endedAt,
  now,
  counterpartExists,
}: {
  state: TradeState;
  endedAt: Date | null;
  now: Date;
  counterpartExists: boolean;
}): FeedbackOpening {
  const ended = rateableEnding(state);
  // an ended trade always has its end time
  if (ended === null || endedAt === null) return { status: "ineligible" };
  const closesAt = new Date(endedAt.getTime() + FEEDBACK_WINDOW_DAYS * DAY);
  if (now.getTime() >= closesAt.getTime()) {
    return { status: "closed", closedAt: closesAt };
  }
  return counterpartExists
    ? { status: "open", ended, endedAt, closesAt }
    : { status: "counterpart_gone" };
}

// whole days left to rate, so the last day reads as 0
export function feedbackDaysLeft(closesAt: Date, now: Date) {
  return Math.max(0, Math.floor((closesAt.getTime() - now.getTime()) / DAY));
}

/**
 * The rater's role: with a payment, its sender is the buyer and the other
 * side the seller. A swap has two traders.
 */
export function feedbackRole(
  items: readonly TradeItemState[],
  side: TradeSide,
): FeedbackRole {
  const payment = items.find((item) => item.kind === "payment");
  if (payment === undefined) return "trader";
  return payment.sender === side ? "buyer" : "seller";
}

const ratedRoles = {
  buyer: "seller",
  seller: "buyer",
  trader: "trader",
} as const satisfies Record<FeedbackRole, FeedbackRole>;

/**
 * The rated party's role, given the rater's. A rating left by a buyer is
 * feedback as a seller.
 */
export function ratedRole(raterRole: FeedbackRole): FeedbackRole {
  return ratedRoles[raterRole];
}

// how many starred ratings an average needs before it shows
const FEEDBACK_AVERAGES_MIN = 10;

// an average star rating to one decimal, once enough ratings carry stars
export function averageStars(sum: number, count: number) {
  return count < FEEDBACK_AVERAGES_MIN
    ? null
    : Math.round((sum / count) * 10) / 10;
}
