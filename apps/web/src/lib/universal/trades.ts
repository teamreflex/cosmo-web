import type {
  ReportStatus,
  TradeEvent,
  TradeItemKind,
  TradeSide,
} from "@apollo/database/web/types";
import type { TradeState } from "@apollo/trades/lifecycle";
import type { TradeItemStatus } from "@apollo/trades/transfers";
import type { PublicUser } from "./auth";
import type { FeedbackRep, TradeFeedbackView } from "./feedback";
import type { Objekt } from "./objekt-conversion";
import type { ListingFeedItem } from "./trade-listings";

/**
 * One side of a trade. All are null once the side's account is deleted,
 * since its pinned address may since belong to someone else. Otherwise the
 * username and the rating are those of the pinned address, the rating null
 * before its first visible one.
 */
export type TradeParty = TradePartyName & { rep: FeedbackRep | null };

// a side as lists that don't show ratings name it
export type TradePartyName = {
  user: PublicUser | null;
  cosmoUsername: string | null;
};

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
 * The dispute that froze a disputed trade: when it was opened, and by a
 * party with their reason, or by staff banning one.
 */
export type TradeDispute = {
  at: Date;
  event: Extract<TradeEvent, { type: "disputed" }>;
};

/**
 * A trade as its page shows it. `deadlinePassed` says the deadline has
 * passed the drain's watermark, so the parties can no longer act.
 * `feedback` is where the viewer's feedback stands, `none` for staff.
 */
export type TradeView = {
  id: string;
  state: TradeState;
  deadlineAt: Date;
  endedAt: Date | null;
  dispute: TradeDispute | null;
  deadlinePassed: boolean;
  listingId: string | null;
  parties: Record<TradeSide, TradeParty>;
  items: TradeItemView[];
  events: { id: number; createdAt: Date; event: TradeEvent }[];
  feedback: TradeFeedbackView;
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
 * One side of a trade in a My trades row: the objekts it sends, as the
 * Listings feed shows an offered side, and how many the drain has seen.
 */
export type MyTradeSide = {
  items: ListingFeedItem[];
  sent: number;
};

/**
 * A trade as My trades lists it, from the viewer's side. `needsYou` says
 * the trade is accepted, its deadline hasn't passed the drain's watermark,
 * and the viewer still owes something.
 */
export type MyTradeRow = {
  id: string;
  state: TradeState;
  deadlineAt: Date;
  dispute: TradeDispute | null;
  endedAt: Date | null;
  listingId: string | null;
  counterparty: TradePartyName;
  send: MyTradeSide;
  get: MyTradeSide;
  needsYou: boolean;
};

/**
 * A page of My trades; either tab pages on until `nextCursor` is undefined.
 */
export type MyTradesPage = {
  rows: MyTradeRow[];
  nextCursor: string | undefined;
};
