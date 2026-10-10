import type { Collection, Transfer } from "@/lib/server/db/indexer/schema";
import type {
  CosmoObjekt,
  ObjektBaseFields,
} from "@apollo/cosmo/types/objekts";
import type { Era, Event } from "@apollo/database/web/types";

// alias the indexer type
export type IndexedObjekt = Collection;

type LegacyObjekt = ObjektBaseFields | CosmoObjekt | IndexedObjekt;
export type ObjektResponse<T extends LegacyObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: T[];
  nextStartAfter: number | undefined;
};

// metadata
export interface CollectionDataEvent extends Pick<
  Event,
  "id" | "slug" | "name" | "eventType" | "twitterUrl" | "description"
> {
  era: Pick<Era, "id" | "slug" | "name" | "spotifyAlbumArt" | "imageUrl">;
}

export type ObjektCollectionData = {
  id: number;
  collectionId: string;
  description: string | null;
  event: CollectionDataEvent | null;
};

export type PriceStats = {
  medianPriceUsd: number;
  listingCount: number;
  minPriceUsd: number;
  maxPriceUsd: number;
  updatedAt: string;
};

export type ObjektMetadata = {
  total: number;
  transferable: number;
  percentage: number;
  data: ObjektCollectionData | undefined;
  priceStats: PriceStats | null;
};

export const priceHistoryRanges = ["7d", "30d", "90d", "all"] as const;
export type PriceHistoryRange = (typeof priceHistoryRanges)[number];

export const priceHistoryRangeDays = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} satisfies Record<Exclude<PriceHistoryRange, "all">, number>;

export type PriceHistoryPoint = {
  date: string;
  floorUsd: number;
  medianUsd: number;
  listingCount: number;
};

/**
 * With fewer snapshots than this the range toggle is locked to all, and the
 * chart marks each point, since the lines are too short to read on their own.
 */
export const SPARSE_PRICE_HISTORY = 8;

export type PriceHistory = {
  points: PriceHistoryPoint[];
  /**
   * The first snapshot and how many there are across every range, or null
   * when the collection has never been snapshotted.
   */
  tracking: { since: string; snapshots: number } | null;
};

export type SerialTransfer = Transfer & {
  fromUsername: string | null;
  toUsername: string | null;
};

export type SerialObjekt = {
  username: string | null;
  address: string;
  serial: number;
  transfers: SerialTransfer[];
};
