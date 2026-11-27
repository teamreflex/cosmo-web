import {
  type OfferCloser,
  offerClosers,
  type PaymentMethod,
  type ReportStatus,
  type TradeEvent,
  type TradeSide,
} from "@apollo/database/web/types";
import type { SerialPick } from "@apollo/trades/holdings";
import type {
  NextStep,
  TradePart,
  TradeParts,
  TradeState,
} from "@apollo/trades/lifecycle";
import type { PaymentItem } from "@apollo/trades/payment";
import type { PaymentStatus, TradeItemStatus } from "@apollo/trades/transfers";
import { addr } from "@apollo/util";
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

// an objekt item as the trade page shows it
export type TradeItemView = TradeNamedItem & {
  id: number;
  // its position in the trade's `state.items`, which item events name
  index: number;
  sender: TradeSide;
  transferredAt: Date | null;
  txHash: string | null;
  // its sender locked it in Apollo while it's still owed, which COSMO ignores
  locked: boolean;
  status: TradeItemStatus;
  // another copy its receiver accepted in place of the pinned token
  substitute: TradeSubstitute | null;
};

/**
 * Where another copy of an objekt came from: the item's sender's pinned
 * address, an address someone linked on Apollo, or one nobody did.
 */
export type SubstituteSource =
  | { kind: "sender" }
  | { kind: "known"; username: string }
  | { kind: "unknown"; address: string };

export function substituteSource(
  from: string,
  senderAddress: string | null,
  known: ReadonlyMap<string, { username: string }>,
): SubstituteSource {
  const address = addr(from);
  if (senderAddress !== null && address === addr(senderAddress)) {
    return { kind: "sender" };
  }
  const account = known.get(address);
  return account === undefined
    ? { kind: "unknown", address }
    : { kind: "known", username: account.username };
}

// another copy its receiver accepted in place of an objekt
export type TradeSubstitute = {
  tokenId: number;
  serial: number | null;
  from: SubstituteSource;
};

/**
 * A drained transfer of another copy of an objekt's collection to its
 * receiver, which they could accept in its place.
 */
export type SubstituteCandidate = TradeSubstitute & { hash: string; at: Date };

/**
 * A trade's payment as its page shows it: the stored item (PaymentItem),
 * its amount for every unit the trade took, and where it stands as the
 * trade's status reads it (PaymentStatus).
 */
export type TradePaymentView = PaymentItem & { status: PaymentStatus };

/**
 * The dispute that froze a disputed trade: when it was opened, and by a
 * party with their reason, or by staff banning one.
 */
export type TradeDispute = {
  at: Date;
  event: Extract<TradeEvent, { type: "disputed" }>;
};

// whether a ban, an account deletion or the listing closing ended an offer, rather than a party
export function isOfferCloser(by: TradeSide | OfferCloser): by is OfferCloser {
  return offerClosers.some((closer) => closer === by);
}

// what closed an offer when a ban, an account deletion or its listing closing ended it, rather than a party
export function offerCloser(event: TradeEvent | null): OfferCloser | null {
  return (event?.type === "declined" || event?.type === "withdrawn") &&
    isOfferCloser(event.by)
    ? event.by
    : null;
}

/**
 * Where a trade is. An offer is on its `offer` stage until the side that
 * didn't propose it accepts it, with the side that proposed it, when it
 * expires, what closed it when a ban, an account deletion or its listing
 * closing did rather than a party, and, once countered, the counter's id, whether it still waits for
 * an answer and the objekts it swaps in. Anything accepted is on its `trade`
 * stage, with the side that proposed it when it started as an offer (null
 * for a claim), where `deadlinePassed` says the deadline has passed the
 * drain's watermark, so the parties can no longer act.
 */
export type TradeStage =
  | {
      stage: "offer";
      proposedBy: TradeSide;
      expiresAt: Date;
      closer: OfferCloser | null;
      counter: {
        id: string;
        pending: boolean;
        items: TradeNamedItem[];
      } | null;
    }
  | {
      stage: "trade";
      proposedBy: TradeSide | null;
      deadlineAt: Date;
      deadlinePassed: boolean;
    };

/**
 * A trade as its page shows it. `items` are its objekts and `payment` its
 * payment, if any, with `paymentMethods` the methods its listing accepts,
 * which the payment's recipient confirms one of. `parts` is what each side
 * does (tradeParts()). `parentId` is the offer a
 * counter answers. `feedback` is where the viewer's feedback stands, `none`
 * for staff.
 */
export type TradeView = TradeStage & {
  id: string;
  payment: TradePaymentView | null;
  paymentMethods: PaymentMethod[];
  state: TradeState;
  parts: TradeParts;
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
 * the dispute report it is under, if any, and the open report they write
 * to its chat under, if any.
 */
export type TradeViewer =
  | { kind: "party"; side: TradeSide }
  | {
      kind: "staff";
      report: { id: string; status: ReportStatus } | null;
      chatReportId: string | null;
    };

// the My trades tabs that list trades: live trades, and those that have ended
export const myTradesTabs = ["active", "finished"] as const;
export type MyTradesTab = (typeof myTradesTabs)[number];

// every My trades tab: the trade tabs, then the viewer's open listings
export const myTradesPageTabs = [...myTradesTabs, "listings"] as const;
export type MyTradesPageTab = (typeof myTradesPageTabs)[number];

/**
 * One side of a trade in a My trades row: the objekts it sends, as the
 * Listings feed shows an offered side, how many the drain has seen, and
 * what it does (TradePart) with the payment it sends, if any.
 */
export type MyTradeSide = {
  items: ListingFeedItem[];
  sent: number;
} & (
  | { part: "send"; payment: null }
  | {
      part: Exclude<TradePart, "send">;
      payment: PaymentItem;
    }
);

/**
 * A trade as My trades lists it, from the viewer's side. `dueAt` is an
 * accepted trade's deadline, or until then the offer's expiry. `nextStep`
 * is what the viewer has to do next (nextStep()), null when nothing.
 * `closer` says what ended the offer when a ban, an account
 * deletion or its listing closing did, rather than a party.
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
  nextStep: NextStep | null;
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
