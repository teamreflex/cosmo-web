import type { PublicUser } from "@/lib/universal/auth";
import type { Objekt } from "@/lib/universal/objekt-conversion";

export type PartnerMatchRow = {
  userId: string;
  theyHaveIWant: string[];
  iHaveTheyWant: string[];
};

export type TradePartner = {
  userId: string;
  username: string;
  user: PublicUser;
  theyHaveIWant: string[];
  iHaveTheyWant: string[];
};

export type TradePartnersResponse = {
  partners: TradePartner[];
  collections: Record<string, Objekt.Collection>;
};
