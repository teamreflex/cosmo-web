import { m } from "@/i18n/messages";
import type {
  SubstituteSource,
  TradeItemView,
  TradeView,
} from "@/lib/universal/trades";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide, type TradePart } from "@apollo/trades/lifecycle";
import { accountName, formatSerial, shortAddress } from "@apollo/util";
import { formatError } from "./errors";
import {
  formatPartnerTokenRefusal,
  formatTokenRefusal,
  offerTokenRefusal,
} from "./errors/trades";
import { objektName, partyName } from "./trade-listings";

/**
 * Who an offer is between, each named: the side that proposed it and the
 * side that answers it. A claim, which nobody proposed, reads as its poster
 * (`from`) setting the terms its claimer accepts.
 */
export function offerRoles(trade: Pick<TradeView, "proposedBy" | "parties">) {
  const proposedBy = trade.proposedBy ?? "from";
  const answeredBy = otherSide(proposedBy);
  return {
    proposedBy,
    answeredBy,
    sender: partyName(trade.parties[proposedBy]),
    recipient: partyName(trade.parties[answeredBy]),
  };
}

/**
 * What a side's party is to the trade: a listing's poster, or its claimer,
 * who accepted it or made an offer on it, or a direct offer's sender or
 * recipient. A direct offer has no listing.
 */
export function partyRole(
  side: TradeSide,
  { listingId, proposedBy }: Pick<TradeView, "listingId" | "proposedBy">,
) {
  if (listingId === null) {
    return side === "from"
      ? m.trade_page_role_sender()
      : m.trade_page_role_recipient();
  }
  if (side === "from") return m.trade_page_role_poster();
  return proposedBy === null
    ? m.trade_page_role_claimer()
    : m.trade_page_role_offerer();
}

/**
 * An item's objekt, "Atom02 HeeJin 201Z", or its copied slug when the
 * indexer has lost the collection.
 */
export function itemLabel(item: Pick<TradeItemView, "collection" | "slug">) {
  return item.collection === null
    ? (item.slug ?? m.notification_unknown_objekt())
    : objektName(item.collection, item.collection);
}

/**
 * An item's objekt and serial, "Atom02 HeeJin 201Z #00217".
 */
export function itemName(
  item: Pick<TradeItemView, "collection" | "slug" | "serial">,
) {
  return item.serial === null
    ? itemLabel(item)
    : `${itemLabel(item)} ${formatSerial(item.serial)}`;
}

// the serial an item pins, "#00217", or its objekt where the indexer lost the serial
export function pinnedLabel(
  item: Pick<TradeItemView, "collection" | "slug" | "serial">,
) {
  return item.serial === null ? itemLabel(item) : formatSerial(item.serial);
}

/**
 * Who another copy of an objekt came from: the sender as the page names
 * them, another account's @name, or a short address nobody linked.
 */
export function substituteSourceName(
  source: SubstituteSource,
  senderName: string,
) {
  switch (source.kind) {
    case "sender":
      return senderName;
    case "known":
      return `@${accountName(source.username)}`;
    case "unknown":
      return shortAddress(source.address);
  }
}

// a transfer on the chain's block explorer
export function txUrl(hash: string) {
  return `https://abscan.org/tx/${hash}`;
}

// "1:14 PM" in the app locale, for a chat message or marker
export const chatTimeFormat = {
  hour: "numeric",
  minute: "2-digit",
} satisfies Intl.DateTimeFormatOptions;

// "Oct 13, 1:14 PM" in the app locale, for every time on the trade page
export const tradeTimeFormat = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
} satisfies Intl.DateTimeFormatOptions;

// "Tue, Oct 14" in the app locale, for the day dividers in a chat
export const chatDayFormat = {
  weekday: "short",
  month: "short",
  day: "numeric",
} satisfies Intl.DateTimeFormatOptions;

/**
 * Why an offer action was refused, naming the copy from `copies` when the
 * server could tell which: the caller's own with why, or one on the other
 * party's side without.
 */
export function formatOfferError(
  error: Error,
  copies: Iterable<
    Pick<TradeItemView, "tokenId" | "serial" | "collection" | "slug">
  >,
) {
  const refusal = offerTokenRefusal(error);
  const copy = [...copies].find(
    ({ tokenId }) => refusal !== null && tokenId === refusal.tokenId,
  );
  if (refusal === null || copy === undefined || copy.serial === null) {
    return formatError(error);
  }
  const token = { objekt: itemLabel(copy), serial: copy.serial };
  return refusal.side === "own"
    ? formatTokenRefusal(refusal.reason, token)
    : formatPartnerTokenRefusal(token);
}

/**
 * What accepting an offer asks of each side when it carries a payment: the
 * other side pays and sends nothing else (`paid_only`), pays beside their
 * objekts (`paid`), or the viewer pays and sends nothing else
 * (`paying_only`) or pays beside their objekts (`paying`).
 */
export type AcceptPayment = "paid_only" | "paid" | "paying_only" | "paying";

const acceptPayments = {
  send: null,
  pay: "paid_only",
  send_pay: "paid",
} as const satisfies Record<TradePart, AcceptPayment | null>;

/**
 * How accepting the offer splits its payment, from the viewer's part and
 * the other side's (TradePart). Null without a payment.
 */
export function acceptPayment(
  you: TradePart,
  them: TradePart,
): AcceptPayment | null {
  if (you === "send") return acceptPayments[them];
  return you === "pay" ? "paying_only" : "paying";
}
