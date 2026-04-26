import type { PublicUser } from "@/lib/universal/auth";
import type { Objekt } from "@/lib/universal/objekt-conversion";

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
