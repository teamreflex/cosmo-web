import type { PublicUser } from "@/lib/universal/auth";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { OfferSerials } from "@/lib/universal/trades";
import type { ObjektList } from "@apollo/database/web/types";

export type PartnerListMatch = {
  listId: string;
  listSlug: string;
  listName: string;
  theyHaveIWant: string[];
  iHaveTheyWant: string[];
};

export type PartnerMatchRow = {
  userId: string;
  listId: string;
  listSlug: string;
  listName: string;
  theyHaveIWant: string[];
  iHaveTheyWant: string[];
};

export type TradePartner = {
  userId: string;
  username: string;
  user: PublicUser;
  // whether they hold market access, without which they can't receive a direct offer
  offerable: boolean;
  matches: PartnerListMatch[];
};

export type TradePartnersResponse = {
  partners: TradePartner[];
  collections: Record<string, Objekt.Collection>;
};

/**
 * The collections a counter to a pending offer could trade, from the
 * caller's side, with the offer's sender it would go to and the copy
 * behind each of the first MAX_OFFER_SERIAL_SLUGS a side.
 */
export type CounterMatches = {
  partnerId: string;
  give: string[];
  get: string[];
  collections: Record<string, Objekt.Collection>;
  serials: OfferSerials;
};

export type ListShelfPreview = Pick<
  Objekt.Collection,
  "slug" | "collectionId" | "frontImage" | "frontImageVersion"
>;

/**
 * A list as shown on the profile's Lists shelf, with images of its first few
 * entries for the tile's card fan.
 */
export type ListShelfItem = ObjektList & {
  previews: ListShelfPreview[];
};

/**
 * Both `name` and `slug` are 24 characters at most.
 */
const LIST_LABEL_LENGTH = 24;

type ListLabel = { name: string; slug: string };

/**
 * Renames legacy lists for copying onto a user when their address is linked.
 * Each copy takes the lowest number from 2 up whose slug, compared
 * case-insensitively like the `citext` column, is free among `takenSlugs` and
 * the earlier copies: legacy lists can share a slug, or share one once
 * truncated to fit the suffix.
 */
export function numberLegacyListCopies<T extends ListLabel>(
  takenSlugs: readonly string[],
  lists: readonly T[],
): T[] {
  const taken = new Set(takenSlugs.map((slug) => slug.toLowerCase()));
  return lists.map((list) => {
    for (let n = 2; ; n++) {
      const slug = withSuffix(list.slug, `-${n}`);
      if (!taken.has(slug.toLowerCase())) {
        taken.add(slug.toLowerCase());
        return { ...list, name: withSuffix(list.name, ` ${n}`), slug };
      }
    }
  });
}

function withSuffix(label: string, suffix: string) {
  return `${label.slice(0, LIST_LABEL_LENGTH - suffix.length)}${suffix}`;
}
