import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { OfferSerials } from "@/lib/universal/trades";
import type { SerialPick } from "@apollo/trades/holdings";

export type OfferSide = keyof OfferSerials;

// a picked card's copy, with its collection to name it when the server refuses it
export type OfferCard = SerialPick & {
  slug: string;
  collection: Objekt.Collection;
};

/**
 * The copies picked on each side of an offer, by collection. A pick keeps
 * the copy it was made with when the serials behind the cards refetch, so
 * what's shown picked is what's sent.
 */
export type OfferPicks = Record<OfferSide, ReadonlyMap<string, OfferCard>>;

// what the viewer gives in teal and what they get in amber, wherever an offer or its matches show them
export const offerTones = {
  give: {
    border: "border-teal-500/60",
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-500",
  },
  get: {
    border: "border-amber-500/60",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-500",
  },
} as const satisfies Record<
  OfferSide,
  Record<"border" | "bg" | "text", string>
>;

// the picks with the card's copy added, or its collection's pick taken out
export function togglePick<T extends OfferPicks>(
  picks: T,
  side: OfferSide,
  card: OfferCard,
): T {
  const picked = new Map(picks[side]);
  if (!picked.delete(card.slug)) picked.set(card.slug, card);
  return { ...picks, [side]: picked };
}

// the tokens an offer with these picks gives and asks for
export function pickedTokenIds(picks: OfferPicks) {
  return {
    give: [...picks.give.values()].map(({ tokenId }) => tokenId),
    get: [...picks.get.values()].map(({ tokenId }) => tokenId),
  };
}
