import { m } from "@/i18n/messages";
import type { TradeItemView, TradeParty } from "@/lib/universal/trades";
import { formatSerial } from "./objekt-util";
import { objektName, posterName } from "./trade-listings";

/**
 * A party as the trade page names them: their COSMO username, else their
 * Apollo username, else "Deleted user".
 */
export function partyName(party: TradeParty) {
  return posterName({ poster: party.user, cosmoUsername: party.cosmoUsername });
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

// "Oct 13, 1:14 PM" in the app locale, for every time on the trade page
export const tradeTimeFormat = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
} satisfies Intl.DateTimeFormatOptions;
