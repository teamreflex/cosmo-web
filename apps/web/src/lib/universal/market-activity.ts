import {
  endedTradeStatuses,
  liveTradeStatuses,
  openTradeStatuses,
  type TradeSide,
  type TradeStatus,
} from "@apollo/database/web/types";
import type * as z from "zod";
import type {
  marketActivityCursorSchema,
  marketActivityFiltersSchema,
} from "./schema/trades";
import type { MyTradeSide, TradeDispute, TradePartyName } from "./trades";

// the Kind tabs: offers are trades until accepted, trades are everything from accepted on
export const marketActivityViews = ["all", "offers", "trades"] as const;
export type MarketActivityView = (typeof marketActivityViews)[number];

// the Status select, each a group of trade statuses
export const marketActivityStatuses = [
  "open",
  "pending",
  "accepted",
  "disputed",
  "completed",
  "failed",
  "closed",
] as const;
export type MarketActivityStatus = (typeof marketActivityStatuses)[number];

export type MarketActivityFilters = z.infer<typeof marketActivityFiltersSchema>;

const offerStatuses = [
  "pending",
  "declined",
  "withdrawn",
  "countered",
  "expired",
  "stale",
] satisfies TradeStatus[];

const viewStatuses = {
  all: [...offerStatuses, ...liveTradeStatuses, ...endedTradeStatuses],
  offers: offerStatuses,
  trades: [...liveTradeStatuses, ...endedTradeStatuses],
} satisfies Record<MarketActivityView, TradeStatus[]>;

const statusGroups = {
  open: [...openTradeStatuses],
  pending: ["pending"],
  accepted: ["accepted"],
  disputed: ["disputed"],
  completed: ["completed"],
  failed: ["cancelled", "timed_out"],
  closed: ["declined", "withdrawn", "countered", "expired", "stale"],
} satisfies Record<MarketActivityStatus, TradeStatus[]>;

/**
 * The trade statuses both filters allow. Empty when they share none, as
 * with Trades and a pending offer.
 */
export function marketActivityTradeStatuses({
  view,
  status,
}: MarketActivityFilters): TradeStatus[] {
  const allowed: TradeStatus[] = viewStatuses[view];
  if (status === undefined) return allowed;
  const group: TradeStatus[] = statusGroups[status];
  return allowed.filter((s) => group.includes(s));
}

/**
 * How a trade started: claiming a listing, an offer on a listing, a direct
 * offer, or a counter to the offer `parentId`.
 */
export type MarketActivityOrigin =
  | { kind: "claim"; listingId: string }
  | { kind: "listing_offer"; listingId: string }
  | { kind: "direct_offer" }
  | { kind: "counter"; parentId: string };

/**
 * Where a trade is: a pending offer until it expires, a live trade until its
 * deadline, a disputed one with the dispute that froze it, or how it ended.
 */
export type MarketActivityState =
  | { status: "pending"; dueAt: Date; proposedBy: TradeSide }
  | { status: "accepted"; dueAt: Date }
  | { status: "disputed"; dueAt: Date; dispute: TradeDispute | null }
  | {
      status: Exclude<TradeStatus, "pending" | "accepted" | "disputed">;
    };

/**
 * A trade as the admin Market activity feed lists it, by its latest change.
 * `fromSide` is what the poster or a direct offer's sender sends, `toSide`
 * what the claimer or recipient sends.
 */
export type MarketActivityRow = {
  id: string;
  updatedAt: Date;
  state: MarketActivityState;
  origin: MarketActivityOrigin;
  from: TradePartyName;
  to: TradePartyName;
  fromSide: MyTradeSide;
  toSide: MyTradeSide;
};

/**
 * What the feed showed when Refresh was pressed: each row as of its latest
 * change, and the oldest change shown.
 */
export type MarketSnapshot = {
  versions: ReadonlySet<string>;
  oldest: number;
};

// a trade as of its latest change, so one that changed reads as new though its id was shown
function rowVersion(row: MarketActivityRow) {
  return `${row.id}@${row.updatedAt.getTime()}`;
}

/**
 * The feed's rows, newest change first, as Refresh saw them. With no rows
 * shown, everything after the refresh is new.
 */
export function marketSnapshot(rows: MarketActivityRow[]): MarketSnapshot {
  return {
    versions: new Set(rows.map(rowVersion)),
    oldest: rows.at(-1)?.updatedAt.getTime() ?? Number.NEGATIVE_INFINITY,
  };
}

/**
 * Whether a row changed since the snapshot. A row no newer than the oldest
 * one shown then came from a page Older loaded since, so it isn't new.
 */
export function isNewSince(snapshot: MarketSnapshot, row: MarketActivityRow) {
  return (
    row.updatedAt.getTime() > snapshot.oldest &&
    !snapshot.versions.has(rowVersion(row))
  );
}

export type MarketActivityCursor = z.infer<typeof marketActivityCursorSchema>;

/**
 * A page of the feed. The first page also carries how many trades match the
 * filters in total.
 */
export type MarketActivityPage = {
  rows: MarketActivityRow[];
  nextCursor: MarketActivityCursor | undefined;
  total: number | undefined;
};

/**
 * The market's last 24 hours, by when each step happened, plus the trades
 * in dispute now.
 */
export type MarketSummary = {
  offersSent: number;
  claims: number;
  offersAccepted: number;
  completed: number;
  endedEarly: number;
  disputed: number;
};
