import type { PublicUser } from "./auth";

/**
 * One priced serial on someone's sale list, shaped for the listings dialog.
 * `priceUsd` is null when no FX rate exists for the list currency.
 * `sellerCosmo` is the seller's linked COSMO username, which their profile
 * and their lists are routed under.
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
    slug: string;
  };
  seller: PublicUser;
  sellerDisplay: string;
  sellerCosmo: string | null;
};

/**
 * Price spread of the listings that have a USD price. Listings in a currency
 * without an FX rate can't be compared, so they're left out, matching the
 * market card's count and floor.
 */
export type ListingStats = {
  count: number;
  floorUsd: number;
  medianUsd: number;
  maxUsd: number;
};

export function listingStats(
  listings: CollectionListing[],
): ListingStats | null {
  const prices = listings
    .flatMap((l) => (l.priceUsd === null ? [] : [l.priceUsd]))
    .sort((a, b) => a - b);
  const floorUsd = prices[0];
  const maxUsd = prices[prices.length - 1];
  if (floorUsd === undefined || maxUsd === undefined) return null;

  const mid = Math.floor(prices.length / 2);
  const upper = prices[mid] ?? maxUsd;
  const lower = prices.length % 2 === 0 ? (prices[mid - 1] ?? upper) : upper;

  return {
    count: prices.length,
    floorUsd,
    medianUsd: (lower + upper) / 2,
    maxUsd,
  };
}
