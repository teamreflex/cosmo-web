import {
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "@/lib/universal/cosmo";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { PgSelect } from "drizzle-orm/pg-core";
import { objekts } from "../db/indexer/schema";
import { fetchObjektListWithEntries } from ".";
import { ObjektList } from "@/lib/universal/objekt-index";

export function withSort<T extends PgSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(objekts.timestamp));
    case "oldest":
      return qb.orderBy(asc(objekts.timestamp));
    case "noAscending":
      return qb.orderBy(asc(objekts.collectionNo));
    case "noDescending":
      return qb.orderBy(desc(objekts.collectionNo));
  }
}

export function withClass(classes: ValidClass[]) {
  switch (classes.length) {
    case 0:
      return [];
    case 1:
      return [eq(objekts.class, classes[0])];
    default:
      return [inArray(objekts.class, classes)];
  }
}

export function withSeason(seasons: ValidSeason[]) {
  switch (seasons.length) {
    case 0:
      return [];
    case 1:
      return [eq(objekts.season, seasons[0])];
    default:
      return [inArray(objekts.season, seasons)];
  }
}

export function withOnlineType(onlineTypes: ValidOnlineType[]) {
  switch (onlineTypes.length) {
    case 0:
      return [];
    case 1:
      return [eq(objekts.on_offline, onlineTypes[0])];
    default:
      return [inArray(objekts.on_offline, onlineTypes)];
  }
}

export function withMember(member: string | null | undefined) {
  return member ? [eq(objekts.member, member)] : [];
}

export function withArtist(artist: ValidArtist | undefined) {
  return artist ? [eq(objekts.artist, artist)] : [];
}

export async function withObjektListEntries(entries: number[]) {
  if (entries.length === 0) {
    return [];
  }

  return [inArray(objekts.id, entries)];
}
