import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "./cosmo/common";
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

export type ParsedObjektParams = {
  list?: string | null;
  address?: string | null;
  page: number;
  sort: ValidSort;
  season: ValidSeason[];
  class: ValidClass[];
  on_offline: ValidOnlineType[];
  member?: string | null;
  artist?: ValidArtist;
  collectionNo: string[];
};

export function parseParams(params: URLSearchParams): ParsedObjektParams {
  return {
    list: params.has("list") ? params.get("list") : undefined,
    address: params.has("address") ? params.get("address") : undefined,
    page: parseInt(params.get("page") ?? "1"),
    sort: params.has("sort") ? (params.get("sort") as ValidSort) : "newest",
    season: params.getAll("season") as ValidSeason[],
    class: params.getAll("class") as ValidClass[],
    on_offline: params.getAll("on_offline") as ValidOnlineType[],
    member: params.has("member") ? params.get("member") : undefined,
    artist: params.has("artist")
      ? (params.get("artist") as ValidArtist)
      : undefined,
    collectionNo: params.getAll("collectionNo"),
  };
}

export function parsePage<T>(data: any) {
  return {
    ...data,
    nextStartAfter: data.nextStartAfter
      ? parseInt(data.nextStartAfter)
      : undefined,
  } as T;
}
