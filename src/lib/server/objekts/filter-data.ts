import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { unstable_cache } from "next/cache";

/**
 * Fetch all unique collections from the index.
 */
async function fetchUniqueCollections() {
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
async function fetchUniqueSeasons() {
  const rows = await indexer
    .selectDistinctOn([collections.artist, collections.season], {
      createdAt: collections.createdAt,
      artist: collections.artist,
      season: collections.season,
    })
    .from(collections);

  // transform rows into artist with seasons array
  const artistMap = new Map<string, string[]>();
  for (const row of rows) {
    if (!artistMap.has(row.artist)) {
      artistMap.set(row.artist, []);
    }
    artistMap.get(row.artist)?.push(row.season);
  }

  return Array.from(artistMap.entries()).map(([artistId, seasons]) => ({
    artistId,
    seasons,
  }));
}

/**
 * Fetch all unique classes and group by artist.
 */
async function fetchUniqueClasses() {
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

/**
 * Fetch all unique collections, seasons, and classes.
 */
export const fetchFilterData = unstable_cache(
  async () => {
    const [collections, seasons, classes] = await Promise.all([
      fetchUniqueCollections(),
      fetchUniqueSeasons(),
      fetchUniqueClasses(),
    ]);

    return {
      collections,
      seasons,
      classes,
    };
  },
  ["filter-data"],
  {
    revalidate: 60 * 60 * 4, // 4 hours
  }
);
