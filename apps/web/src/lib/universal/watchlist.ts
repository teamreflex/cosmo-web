import type { Collection } from "@/lib/server/db/indexer/schema";
import type { MarketSort } from "./market";

export const DEFAULT_WATCHLIST_SORT: MarketSort = "floorAsc";

/**
 * A watched collection with its market standing; one with no listings has
 * no floor.
 */
export type WatchlistItem = Collection & {
  floorUsd: number | null;
  listingCount: number;
};

export type WatchlistResponse = {
  objekts: WatchlistItem[];
  nextStartAfter: number | undefined;
  /**
   * Watched collections matching the filters. Only the first page counts them.
   */
  total: number | null;
};
