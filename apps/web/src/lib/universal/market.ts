import type { Collection } from "@/lib/server/db/indexer/schema";
import type { ObjektResponse } from "./objekts";

export const marketSorts = [
  "floorAsc",
  "floorDesc",
  "mostListed",
  "recentlyListed",
] as const;
export type MarketSort = (typeof marketSorts)[number];
export const DEFAULT_MARKET_SORT: MarketSort = "floorAsc";

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
 * Aggregate of every sale listing of one collection, keyed by slug.
 * `lastListed` is epoch milliseconds so it survives the Redis cache as JSON.
 */
export type MarketStats = {
  collectionId: string;
  floorUsd: number;
  listingCount: number;
  lastListed: number;
};

export type MarketItem = Collection & Omit<MarketStats, "collectionId">;

export type MarketResponse = ObjektResponse<MarketItem> & {
  listingTotal: number;
  /**
   * USD floor of every collection matching all filters but the price range,
   * for the price filter's histogram. Only the first page carries it.
   */
  floors?: number[];
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

export function inFloorBounds(floorUsd: number, bounds: FloorBounds) {
  return (
    (bounds.minFloorUsd === undefined || floorUsd >= bounds.minFloorUsd) &&
    (bounds.maxFloorUsd === undefined || floorUsd < bounds.maxFloorUsd)
  );
}
