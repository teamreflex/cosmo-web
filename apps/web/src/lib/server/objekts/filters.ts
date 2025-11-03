import { asc, between, desc, eq, inArray } from "drizzle-orm";
import { collections, objekts } from "../db/indexer/schema";
import type {
  ValidArtist,
  ValidOnlineType,
  ValidSort,
} from "@/lib/universal/cosmo/common";
import type { PgSelect } from "drizzle-orm/pg-core";

/**
 * Sorting for user collections.
 */
export function withCollectionSort<T extends PgSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(objekts.receivedAt), asc(objekts.id));
    case "oldest":
      return qb.orderBy(asc(objekts.receivedAt), asc(objekts.id));
    case "noAscending":
      return qb.orderBy(asc(collections.collectionNo), asc(collections.id));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo), asc(collections.id));
    case "serialAsc":
      return qb.orderBy(asc(objekts.serial), asc(objekts.id));
    case "serialDesc":
      return qb.orderBy(desc(objekts.serial), asc(objekts.id));
  }
}

/**
 * Sorting for objekts index. Use collection.id to stabilize the sort.
 */
export function withObjektIndexSort<T extends PgSelect>(
  qb: T,
  sort: ValidSort,
) {
  switch (sort) {
    case "newest":
    default:
      return qb.orderBy(desc(collections.createdAt), asc(collections.id));
    case "oldest":
      return qb.orderBy(asc(collections.createdAt), asc(collections.id));
    case "noAscending":
      return qb.orderBy(asc(collections.collectionNo), asc(collections.id));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo), asc(collections.id));
  }
}

/**
 * Filter by class.
 */
export function withClass(classes: string[]) {
  switch (classes.length) {
    case 0:
      return [];
    case 1:
      return [eq(collections.class, classes[0]!)];
    default:
      return [inArray(collections.class, classes)];
  }
}

/**
 * Filter by season.
 */
export function withSeason(seasons: string[]) {
  switch (seasons.length) {
    case 0:
      return [];
    case 1:
      return [eq(collections.season, seasons[0]!)];
    default:
      return [inArray(collections.season, seasons)];
  }
}

/**
 * Filter by online type.
 */
export function withOnlineType(onlineTypes: ValidOnlineType[]) {
  switch (onlineTypes.length) {
    case 0:
      return [];
    case 1:
      return [eq(collections.onOffline, onlineTypes[0]!)];
    default:
      return [inArray(collections.onOffline, onlineTypes)];
  }
}

/**
 * Filter by member.
 */
export function withMember(member: string | null | undefined) {
  return member ? [eq(collections.member, member)] : [];
}

/**
 * Filter by artist.
 */
export function withArtist(artist: ValidArtist | undefined | null) {
  return artist ? [eq(collections.artist, artist.toLowerCase())] : [];
}

/**
 * Filter by artist.
 */
export function withSelectedArtists(artists: string[] | undefined | null) {
  if (!artists) return [];
  return artists.length > 0
    ? [
        inArray(
          collections.artist,
          artists.map((a) => a.toLowerCase()),
        ),
      ]
    : [];
}

/**
 * Filter by collection number.
 */
export function withCollections(selected: string[] | null | undefined) {
  return selected && selected.length > 0
    ? [inArray(collections.collectionNo, selected)]
    : [];
}

/**
 * Filter by objekt list entries.
 */
export function withObjektListEntries(entries: string[]) {
  if (entries.length === 0) {
    return [];
  }

  return [inArray(collections.slug, entries)];
}

/**
 * Filter by timeframe.
 */
export function withTimeframe(timeframe?: [string, string]) {
  if (!timeframe) return [];
  return [between(objekts.mintedAt, ...timeframe)];
}

/**
 * Filter by transferable.
 */
export function withTransferable(transferable: boolean | null | undefined) {
  return transferable ? [eq(objekts.transferable, transferable)] : [];
}
