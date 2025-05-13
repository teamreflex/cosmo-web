import type { Collection } from "@/lib/server/db/indexer/schema";
import { ObjektMetadataEntry, CosmoAccount } from "@/lib/server/db/schema";
import { CosmoObjekt, ObjektBaseFields } from "@/lib/universal/cosmo/objekts";

// alias the indexer type
export type IndexedObjekt = Collection;

type LegacyObjekt = ObjektBaseFields | CosmoObjekt | IndexedObjekt;
export type LegacyObjektResponse<T extends LegacyObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: T[];
  nextStartAfter?: number | undefined;
};

// metadata
interface ObjektInformation extends ObjektMetadataEntry {
  profile?: Pick<CosmoAccount, "username"> | null;
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
export function parsePage<T>(data: { nextStartAfter?: string }): T {
  return {
    ...data,
    nextStartAfter: data.nextStartAfter
      ? parseInt(data.nextStartAfter)
      : undefined,
  } as T;
}
