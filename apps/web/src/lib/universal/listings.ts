import type { PublicUser } from "./auth";

/**
 * One priced serial on someone's sale list, shaped for the listings dialog.
 * `priceUsd` is null when no FX rate exists for the list currency.
 */
export type CollectionListing = {
  entryId: string;
  tokenId: string;
  serial: number | null;
  price: number;
  currency: string;
  priceUsd: number | null;
  listedAt: string;
  list: {
    id: string;
    name: string;
  };
  seller: PublicUser;
  sellerDisplay: string;
};
