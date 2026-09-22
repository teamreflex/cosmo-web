import type { PublicUser } from "@/lib/universal/auth";
import type { Objekt } from "@/lib/universal/objekt-conversion";
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
  matches: PartnerListMatch[];
};

export type TradePartnersResponse = {
  partners: TradePartner[];
  collections: Record<string, Objekt.Collection>;
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
