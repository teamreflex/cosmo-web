import type {
  OfferCloser,
  ReportStatus,
  TradeEvent,
  TradeItemKind,
  TradeSide,
} from "@apollo/database/web/types";
import type { SerialPick } from "@apollo/trades/holdings";
import type { TradeState } from "@apollo/trades/lifecycle";
import type { TradeItemStatus } from "@apollo/trades/transfers";
import type { z } from "zod";
import type { PublicUser } from "./auth";
import type { FeedbackRep, TradeFeedbackView } from "./feedback";
import type { Objekt } from "./objekt-conversion";
import type { myTradesCursorSchema } from "./schema/trades";
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
 * An objekt a trade names, with its serial and collection from the indexer,
 * or null when the indexer doesn't know them.
 */
export type TradeNamedItem = {
  tokenId: number | null;
  slug: string | null;
  serial: number | null;
  collection: Objekt.Collection | null;
};

// an item as the trade page shows it
export type TradeItemView = TradeNamedItem & {
  id: number;
  sender: TradeSide;
  kind: TradeItemKind;
  transferredAt: Date | null;
  txHash: string | null;
  // its sender locked it in Apollo while it's still owed, which COSMO ignores
  locked: boolean;
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
 * Where a trade is. A direct offer is on its `offer` stage until its
 * recipient accepts it, with when it expires, what closed it when a ban or
 * an account deletion did rather than a party, and, once countered, the
 * counter's id, whether it still waits for an answer and the objekts it
 * swaps in. Anything accepted is on its `trade` stage, where
 * `deadlinePassed` says the deadline has passed the drain's watermark, so
 * the parties can no longer act.
 */
export type TradeStage =
  | {
      stage: "offer";
      expiresAt: Date;
      closer: OfferCloser | null;
      counter: {
        id: string;
        pending: boolean;
        items: TradeNamedItem[];
      } | null;
    }
  | { stage: "trade"; deadlineAt: Date; deadlinePassed: boolean };

/**
 * A trade as its page shows it. `parentId` is the offer a counter answers.
 * `feedback` is where the viewer's feedback stands, `none` for staff.
 */
export type TradeView = TradeStage & {
  id: string;
  state: TradeState;
  endedAt: Date | null;
  dispute: TradeDispute | null;
  listingId: string | null;
  parentId: string | null;
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
 * A trade as My trades lists it, from the viewer's side. `dueAt` is an
 * accepted trade's deadline, or until then the offer's expiry. `needsYou`
 * says the viewer has an offer to answer, or an accepted trade whose
 * deadline hasn't passed the drain's watermark and on which they still owe
 * something. `closer` says what ended the offer when a ban or an account
 * deletion did, rather than a party.
 */
export type MyTradeRow = {
  id: string;
  state: TradeState;
  dueAt: Date;
  dispute: TradeDispute | null;
  closer: OfferCloser | null;
  endedAt: Date | null;
  listingId: string | null;
  counterparty: TradePartyName;
  send: MyTradeSide;
  get: MyTradeSide;
  needsYou: boolean;
};

export type MyTradesCursor = z.infer<typeof myTradesCursorSchema>;

/**
 * A page of My trades; either tab pages on until `nextCursor` is undefined.
 */
export type MyTradesPage = {
  rows: MyTradeRow[];
  nextCursor: MyTradesCursor | undefined;
};

/**
 * The copy of each collection a direct offer would trade, by slug, on each
 * side: `give` from the caller and `get` from the other party. Null when
 * they have no copy that can be offered.
 */
export type OfferSerials = Record<
  "give" | "get",
  Record<string, SerialPick | null>
>;
