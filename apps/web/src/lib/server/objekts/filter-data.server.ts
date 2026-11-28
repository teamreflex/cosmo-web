import { collections } from "@apollo/database/indexer/schema";
import { asc } from "drizzle-orm";
import { remember } from "../cache.server";
import { indexer } from "../db/indexer";

export const ROSTERS_CACHE_KEY = "artist-rosters";

/**
 * Each artist's members as the indexer names them, keyed by the artist as
 * the trade tables store it. No member name belongs to two artists.
 * Cached for 1 hour.
 */
export function fetchRosters() {
  return remember(ROSTERS_CACHE_KEY, 60 * 60, async () => {
    const rows = await indexer
      .selectDistinct({
        artist: collections.artist,
        member: collections.member,
      })
      .from(collections);

    const rosters: Record<string, string[]> = {};
    for (const { artist, member } of rows) {
      (rosters[artist] ??= []).push(member);
    }
    return rosters;
  });
}

/**
 * Fetch all unique collections from the index.
 */
export async function fetchUniqueCollections() {
  const rows = await indexer
    .selectDistinctOn([collections.collectionNo], {
      collectionNo: collections.collectionNo,
    })
    .from(collections)
    .orderBy(asc(collections.collectionNo));

  return rows.map((row) => row.collectionNo);
}

/**
 * Fetch all unique seasons and group by artist.
 */
export async function fetchUniqueSeasons() {
  const rows = await indexer
    .selectDistinctOn([collections.artist, collections.season], {
      createdAt: collections.createdAt,
      artist: collections.artist,
      season: collections.season,
    })
    .from(collections);

  // transform rows into artist with seasons array
  const artistMap = new Map<string, { season: string; createdAt: number }[]>();
  for (const row of rows) {
    if (!artistMap.has(row.artist)) {
      artistMap.set(row.artist, []);
    }
    artistMap.get(row.artist)?.push({
      season: row.season,
      createdAt: new Date(row.createdAt).getTime(),
    });
  }

  return Array.from(artistMap.entries()).map(([artistId, seasons]) => {
    return {
      artistId,
      seasons: seasons
        .toSorted((a, b) => a.createdAt - b.createdAt)
        .map((season) => season.season),
    };
  });
}

/**
 * Fetch all unique classes and group by artist.
 */
export async function fetchUniqueClasses() {
  const rows = await indexer
    .selectDistinctOn([collections.artist, collections.class], {
      createdAt: collections.createdAt,
      artist: collections.artist,
      class: collections.class,
    })
    .from(collections);

  // transform rows into artist with classes array
  const artistMap = new Map<string, string[]>();
  for (const row of rows) {
    if (!artistMap.has(row.artist)) {
      artistMap.set(row.artist, []);
    }
    artistMap.get(row.artist)?.push(row.class);
  }

  return Array.from(artistMap.entries()).map(([artistId, classes]) => ({
    artistId,
    classes,
  }));
}
