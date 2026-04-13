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

/**
 * Minimum number of listings required to display price stats.
 */
export const PRICE_STATS_MIN_LISTINGS = 3;

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
