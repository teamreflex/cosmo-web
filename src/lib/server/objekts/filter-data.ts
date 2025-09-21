import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";

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
  const artistMap = new Map<string, string[]>();
  for (const row of rows) {
    if (!artistMap.has(row.artist)) {
      artistMap.set(row.artist, []);
    }
    artistMap.get(row.artist)?.push(row.season);
  }

  return Array.from(artistMap.entries()).map(([artistId, seasons]) => {
    // sort seasons: Atom01, Binary01, Cream01, Atom02
    seasons.sort((a, b) => {
      const [, prefixA, numA] = a.match(/^([a-zA-Z]+)(\d+)$/) ?? [];
      const [, prefixB, numB] = b.match(/^([a-zA-Z]+)(\d+)$/) ?? [];

      if (!prefixA || !prefixB || !numA || !numB) {
        // fallback to default sort if format is unexpected
        return a.localeCompare(b);
      }

      const numComparison = parseInt(numA, 10) - parseInt(numB, 10);
      if (numComparison !== 0) {
        return numComparison; // sort by number first
      }

      return prefixA.localeCompare(prefixB); // then by prefix
    });

    return {
      artistId,
      seasons,
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
