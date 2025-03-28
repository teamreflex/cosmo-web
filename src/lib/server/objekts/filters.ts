import {
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "@/lib/universal/cosmo/common";
import { asc, between, desc, eq, inArray } from "drizzle-orm";
import { PgSelect } from "drizzle-orm/pg-core";
import { collections, objekts } from "../db/indexer/schema";

export function withObjektSort<T extends PgSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(objekts.receivedAt));
    case "oldest":
      return qb.orderBy(asc(objekts.receivedAt));
    case "noAscending":
      return qb.orderBy(asc(collections.collectionNo));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo));
    case "serialAsc":
      return qb.orderBy(asc(objekts.serial));
    case "serialDesc":
      return qb.orderBy(desc(objekts.serial));
  }
}

export function withCollectionSort<T extends PgSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
    default:
      return qb.orderBy(
        desc(collections.createdAt),
        asc(collections.collectionId)
      );
    case "oldest":
      return qb.orderBy(
        asc(collections.createdAt),
        asc(collections.collectionId)
      );
    case "noAscending":
      return qb.orderBy(
        asc(collections.collectionNo),
        desc(collections.createdAt)
      );
    case "noDescending":
      return qb.orderBy(
        desc(collections.collectionNo),
        desc(collections.createdAt)
      );
  }
}

export function withClass(classes: ValidClass[]) {
  switch (classes.length) {
    case 0:
      return [];
    case 1:
      return [eq(collections.class, classes[0])];
    default:
      return [inArray(collections.class, classes)];
  }
}

export function withSeason(seasons: ValidSeason[]) {
  switch (seasons.length) {
    case 0:
      return [];
    case 1:
      return [eq(collections.season, seasons[0])];
    default:
      return [inArray(collections.season, seasons)];
  }
}

export function withOnlineType(onlineTypes: ValidOnlineType[]) {
  switch (onlineTypes.length) {
    case 0:
      return [];
    case 1:
      return [eq(collections.onOffline, onlineTypes[0])];
    default:
      return [inArray(collections.onOffline, onlineTypes)];
  }
}

export function withMember(member: string | null | undefined) {
  return member ? [eq(collections.member, member)] : [];
}

export function withArtist(artist: ValidArtist | undefined | null) {
  return artist ? [eq(collections.artist, artist)] : [];
}

export function withCollections(selected: string[] | null | undefined) {
  return selected && selected.length > 0
    ? [inArray(collections.collectionNo, selected)]
    : [];
}

export function withObjektListEntries(entries: string[]) {
  if (entries.length === 0) {
    return [];
  }

  return [inArray(collections.slug, entries)];
}

export function withTimeframe(timeframe?: [string, string]) {
  if (!timeframe) return [];
  return [between(objekts.mintedAt, ...timeframe)];
}

export function withTransferable(transferable: boolean | null | undefined) {
  return transferable ? [eq(objekts.transferable, transferable)] : [];
}
