import type { Collection, Transfer } from "@/lib/server/db/indexer/schema";
import type {
  CosmoObjekt,
  ObjektBaseFields,
} from "@apollo/cosmo/types/objekts";

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
export type ObjektEventInfo = {
  id: string;
  slug: string;
  name: string;
  eventType: string;
  twitterUrl: string | null;
  description: string | null;
  category: string | null;
  era: {
    id: string;
    slug: string;
    name: string;
    spotifyAlbumArt: string | null;
  } | null;
};

export type ObjektMetadata = {
  total: number;
  transferable: number;
  percentage: number;
  event: ObjektEventInfo | null;
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
