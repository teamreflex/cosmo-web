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
};
