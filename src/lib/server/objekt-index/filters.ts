import {
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "@/lib/universal/cosmo";
import { objekts } from "../db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { MySqlSelect } from "drizzle-orm/mysql-core";

export function withSort<T extends MySqlSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(objekts.createdAt));
    case "oldest":
      return qb.orderBy(asc(objekts.createdAt));
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

// export function withArtist<T extends MySqlSelect>(qb: T, artist: string) {
//   return qb.where(eq(objekts.artist, artist));
// }
