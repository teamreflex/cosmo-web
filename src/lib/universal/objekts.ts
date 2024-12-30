import type { Collection } from "@/lib/server/db/indexer/schema";
import { ObjektMetadataEntry, Profile } from "@/lib/server/db/schema";
export type {
  ObjektList,
  CreateObjektList,
  UpdateObjektList,
} from "@/lib/server/db/schema";
import {
  BFFCollectionGroup,
  CosmoObjekt,
  ObjektBaseFields,
} from "@/lib/universal/cosmo/objekts";

// alias the indexer type
export type IndexedObjekt = Collection;

export type LegacyObjekt = ObjektBaseFields | CosmoObjekt | IndexedObjekt;
export type LegacyObjektResponse<T extends LegacyObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: T[];
  nextStartAfter?: number | undefined;
};

// metadata
interface ObjektInformation extends ObjektMetadataEntry {
  profile?: Profile;
}
export type ObjektMetadata = {
  total: number;
  transferable: number;
  percentage: number;
  metadata: ObjektInformation | undefined;
};

/**
 * Parse a Cosmo-compatible objekts response.
 */
export function parsePage<T>(data: any) {
  return {
    ...data,
    nextStartAfter: data.nextStartAfter
      ? parseInt(data.nextStartAfter)
      : undefined,
  } as T;
}
