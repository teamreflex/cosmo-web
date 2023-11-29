import {
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "@/lib/universal/cosmo";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { PgSelect } from "drizzle-orm/pg-core";
import { collections } from "../db/indexer/schema";

export function withSort<T extends PgSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
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
      return qb.orderBy(asc(collections.collectionNo));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo));
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

export function withArtist(artist: ValidArtist | undefined) {
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

  return [inArray(collections.id, entries)];
}
