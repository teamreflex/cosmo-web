import type { Collection } from "@/lib/server/db/indexer/schema";
import type { z } from "zod";
import type { marketCursorSchema } from "./parsers";

export const marketSorts = [
  "floorAsc",
  "floorDesc",
  "mostListed",
  "recentlyListed",
] as const;
export type MarketSort = (typeof marketSorts)[number];
export const DEFAULT_MARKET_SORT: MarketSort = "recentlyListed";

/**
 * "Listed within" windows, matched against a collection's most recent listing.
 */
export const marketListedWindows = ["24h", "7d", "30d"] as const;
export type MarketListedWindow = (typeof marketListedWindows)[number];

const DAY = 24 * 60 * 60 * 1000;
export const marketListedWindowMs = {
  "24h": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
} satisfies Record<MarketListedWindow, number>;

/**
 * Floor (USD) and listing count across every sale listing of one collection.
 */
export type MarketStats = {
  floorUsd: number;
  listingCount: number;
};

export type MarketItem = Collection & MarketStats;

export type MarketCursor = z.infer<typeof marketCursorSchema>;

export type MarketResponse = {
  objekts: MarketItem[];
  /**
   * Where the next page starts, unset on the last page.
   */
  nextCursor: MarketCursor | undefined;
  /**
   * Listings across the matching collections. Only the first page counts them.
   */
  totals: { listings: number } | null;
};

export type FloorBounds = {
  minFloorUsd?: number;
  maxFloorUsd?: number;
};

/**
 * Converts a price range typed in the viewer's currency into USD floor bounds.
 * Each bound is widened by half the currency's smallest displayed unit, so a
 * floor that displays as exactly the bound is included.
 */
export function toFloorBounds(
  min: number | null | undefined,
  max: number | null | undefined,
  display: { currency: string; rateToUsd: number },
): FloorBounds {
  const digits = new Intl.NumberFormat("en", {
    style: "currency",
    currency: display.currency,
  }).resolvedOptions().maximumFractionDigits;
  const half = 0.5 * 10 ** -(digits ?? 2);

  return {
    minFloorUsd: min == null ? undefined : (min - half) * display.rateToUsd,
    maxFloorUsd: max == null ? undefined : (max + half) * display.rateToUsd,
  };
}

/**
 * Where one of the viewer's sale serials stands against the market. A priced
 * entry is off the market when it has no serial or its list's currency has no
 * rate, since the market only counts rated serials.
 */
export const myListingStatuses = [
  "floor",
  "undercut",
  "onlySeller",
  "offMarket",
  "unpriced",
] as const;
export type MyListingStatusKind = (typeof myListingStatuses)[number];

export type MyListingStatus =
  | { kind: "floor" | "onlySeller" | "offMarket" | "unpriced" }
  // someone else lists the collection cheaper
  | { kind: "undercut"; floorUsd: number };

export const myListingSorts = [
  "gap",
  "recentlyListed",
  "priceAsc",
  "priceDesc",
] as const;
export type MyListingSort = (typeof myListingSorts)[number];
export const DEFAULT_MY_LISTING_SORT: MyListingSort = "recentlyListed";

// `id` is the entry's, as each serial is its own card
export type MyListingItem = Collection & {
  entrySerial: number | null;
  entryTokenId: string | null;
  entryQuantity: number;
  entryPrice: number | null;
  entryPriceUsd: number | null;
  listId: string;
  listCurrency: string;
  listRateToUsd: number | null;
  status: MyListingStatus;
};

export type MyListingsSummary = {
  serials: number;
  priced: number;
  // priced serials with a rate, in USD
  askingTotalUsd: number;
  atFloor: number;
  undercut: number;
  onlySeller: number;
};

export type MyListingsResponse = {
  objekts: MyListingItem[];
  nextStartAfter: number | undefined;
  /**
   * Across every sale list, ignoring filters. Only the first page carries it.
   */
  summary: MyListingsSummary | null;
};
