import type {
  ReportStatus,
  TradeEvent,
  TradeItemKind,
  TradeSide,
} from "@apollo/database/web/types";
import type { TradeState } from "@apollo/trades/lifecycle";
import type { PublicUser } from "./auth";
import type { Objekt } from "./objekt-conversion";

/**
 * One side of a trade. Both are null once the side's account is deleted,
 * since its pinned address may since belong to someone else. Otherwise the
 * username is the COSMO account's behind the pinned address.
 */
export type TradeParty = {
  user: PublicUser | null;
  cosmoUsername: string | null;
};

/**
 * Where an item stands. `sent` is recorded by the drain, and `arrived` is
 * in the receiver's account before the drain has seen it. `moved` left the
 * sender for someone else, and `untransferable` can't move. An ended
 * trade's unsent items are `not_sent`.
 */
export type TradeItemStatus =
  | "sent"
  | "arrived"
  | "waiting"
  | "moved"
  | "untransferable"
  | "not_sent";

/**
 * An item as the trade page shows it, with its serial and collection from
 * the indexer, or null when the indexer doesn't know them.
 */
export type TradeItemView = {
  id: number;
  sender: TradeSide;
  kind: TradeItemKind;
  tokenId: number | null;
  slug: string | null;
  serial: number | null;
  collection: Objekt.Collection | null;
  transferredAt: Date | null;
  txHash: string | null;
  status: TradeItemStatus;
};

/**
 * A trade as its page shows it. `deadlinePassed` says the deadline has
 * passed the drain's watermark, so the parties can no longer act, and
 * `pausedAt` is when the dispute that froze a disputed trade was opened.
 */
export type TradeView = {
  id: string;
  state: TradeState;
  createdAt: Date;
  acceptedAt: Date;
  deadlineAt: Date;
  endedAt: Date | null;
  pausedAt: Date | null;
  deadlinePassed: boolean;
  listingId: string | null;
  parties: Record<TradeSide, TradeParty>;
  items: TradeItemView[];
  events: { id: number; createdAt: Date; event: TradeEvent }[];
};

/**
 * Who is looking at a trade: one of its parties, or staff reading it, with
 * the dispute report it is under, if any.
 */
export type TradeViewer =
  | { kind: "party"; side: TradeSide }
  | { kind: "staff"; report: { id: string; status: ReportStatus } | null };

// the My trades page's tabs: live trades, and those that have ended
export const myTradesTabs = ["active", "finished"] as const;
export type MyTradesTab = (typeof myTradesTabs)[number];

/**
 * One side of a trade in a My trades row: its first objekt, how many there
 * are and how many the drain has seen.
 */
export type MyTradeSide = {
  first: Pick<TradeItemView, "collection" | "slug" | "serial"> | null;
  count: number;
  sent: number;
};

/**
 * A trade as My trades lists it, from the viewer's side. `pause` is the
 * dispute that froze a disputed trade: when, and by a party or by staff
 * banning one. `needsYou` says the trade is accepted and the viewer still
 * owes something.
 */
export type MyTradeRow = {
  id: string;
  side: TradeSide;
  state: TradeState;
  deadlineAt: Date;
  pause: { at: Date; by: TradeSide | "staff" } | null;
  endedAt: Date | null;
  listingId: string | null;
  counterparty: TradeParty;
  send: MyTradeSide;
  get: MyTradeSide;
  needsYou: boolean;
};

/**
 * A page of My trades. The Active tab is one page; Finished pages on until
 * `nextCursor` is undefined.
 */
export type MyTradesPage = {
  rows: MyTradeRow[];
  nextCursor: string | undefined;
};
