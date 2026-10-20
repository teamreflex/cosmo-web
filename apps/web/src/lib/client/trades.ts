import { m } from "@/i18n/messages";
import type { TradeItemView, TradePartyName } from "@/lib/universal/trades";
import type { TradeSide } from "@apollo/database/web/types";
import { formatError } from "./errors";
import { claimFailure, formatTokenRefusal } from "./errors/trades";
import { formatSerial } from "./objekt-util";
import { objektName, posterName } from "./trade-listings";

/**
 * A party as the trade page names them: their COSMO username, else their
 * Apollo username, else "Deleted user".
 */
export function partyName(party: TradePartyName) {
  return posterName({ poster: party.user, cosmoUsername: party.cosmoUsername });
}

/**
 * What a side's party is to the trade: a listing's poster or claimer, or a
 * direct offer's sender or recipient. A direct offer has no listing.
 */
export function partyRole(side: TradeSide, listingId: string | null) {
  if (listingId === null) {
    return side === "from"
      ? m.trade_page_role_sender()
      : m.trade_page_role_recipient();
  }
  return side === "from"
    ? m.trade_page_role_poster()
    : m.trade_page_role_claimer();
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
 * Why an offer action was refused, naming the caller's own copy from
 * `copies` when the server could tell which.
 */
export function formatOfferError(
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
  error: unknown,
  copies: Iterable<
    Pick<TradeItemView, "tokenId" | "serial" | "collection" | "slug">
  >,
) {
  const failed = claimFailure(error);
  const refusal = failed?.kind === "token" ? failed.refusal : null;
  const copy = [...copies].find(
    ({ tokenId }) => refusal !== null && tokenId === refusal.tokenId,
  );
  return refusal !== null && copy !== undefined && copy.serial !== null
    ? formatTokenRefusal(refusal.reason, {
        objekt: itemLabel(copy),
        serial: copy.serial,
      })
    : formatError(error);
}
