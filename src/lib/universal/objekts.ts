import type { Collection } from "@/lib/server/db/indexer/schema";
import { validSorts } from "./cosmo/common";
export type {
  ObjektList,
  CreateObjektList,
  UpdateObjektList,
} from "@/lib/server/db/schema";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";

export type IndexedObjekt = Collection;
export type IndexedCosmoResponse = {
  hasNext: boolean;
  total: number;
  nextStartAfter?: number;
  objekts: IndexedObjekt[];
};
export type ValidObjekt = OwnedObjekt | IndexedObjekt;

// available sort options when using the chain as a data source
export const chainSorts = [...validSorts, "serialAsc", "serialDesc"] as const;

export function parsePage<T>(data: any) {
  return {
    ...data,
    nextStartAfter: data.nextStartAfter
      ? parseInt(data.nextStartAfter)
      : undefined,
  } as T;
}

/**
 * Infer parts of a collection ID.
 */
export const inferObjekt = <
  Season extends string,
  Member extends string,
  Collection extends string
>(
  collectionId: `${Season} ${Member} ${Collection}`
) => {
  const [season, member, collection] = collectionId.split(" ");
  return {
    season: season as Season,
    member: member as Member,
    collectionNo: collection as Collection,
  };
};
