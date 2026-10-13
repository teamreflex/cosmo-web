import type {
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

// who is looking at a trade
export type TradeViewer = { kind: "party"; side: TradeSide };
