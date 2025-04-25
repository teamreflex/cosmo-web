import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { unstable_cache } from "next/cache";

/**
 * Fetch all unique collections from the index.
 */
const fetchUniqueCollections = unstable_cache(
  async () => {
    const rows = await indexer
      .selectDistinctOn([collections.collectionNo], {
        collectionNo: collections.collectionNo,
      })
      .from(collections)
      .orderBy(asc(collections.collectionNo));

    return rows.map((row) => row.collectionNo);
  },
  ["filters", "collections"],
  {
    revalidate: 60 * 60 * 24, // 24 hours
  }
);

/**
 * Fetch all unique seasons and group by artist.
 */
const fetchUniqueSeasons = unstable_cache(
  async () => {
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
  },
  ["filters", "seasons"],
  {
    revalidate: 60 * 60 * 4, // 4 hours
  }
);

/**
 * Fetch all unique classes and group by artist.
 */
const fetchUniqueClasses = unstable_cache(
  async () => {
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
  },
  ["filters", "classes"],
  {
    revalidate: 60 * 60 * 4, // 4 hours
  }
);

/**
 * Fetch all unique collections, seasons, and classes.
 */
export async function fetchFilterData() {
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
}
