import type { PublicCosmo } from "./cosmo-accounts";
import type { Collection, Transfer } from "@/lib/server/db/indexer/schema";
import type { ObjektMetadataEntry } from "@/lib/server/db/schema";
import type {
  CosmoObjekt,
  ObjektBaseFields,
} from "@/lib/universal/cosmo/objekts";

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
interface ObjektInformation extends ObjektMetadataEntry {
  profile?: Pick<PublicCosmo, "username"> | null;
}
export type ObjektMetadata = {
  total: number;
  transferable: number;
  percentage: number;
  metadata: ObjektInformation | undefined;
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
