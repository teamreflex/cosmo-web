import { createServerOnlyFn } from "@tanstack/react-start";
import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";

/**
 * Fetch all unique collections from the index.
 */
export const fetchUniqueCollections = createServerOnlyFn(async () => {
  const rows = await indexer
    .selectDistinctOn([collections.collectionNo], {
      collectionNo: collections.collectionNo,
    })
    .from(collections)
    .orderBy(asc(collections.collectionNo));

  return rows.map((row) => row.collectionNo);
});

/**
 * Fetch all unique seasons and group by artist.
 */
export const fetchUniqueSeasons = createServerOnlyFn(async () => {
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
});

/**
 * Fetch all unique classes and group by artist.
 */
export const fetchUniqueClasses = createServerOnlyFn(async () => {
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
});
