import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { count, eq } from "drizzle-orm";
import type { ArtistStats, ProcessingArtistStats } from "../universal/progress";
import { unstable_cacheLife as cacheLife } from "next/cache";

/**
 * Get objekts stats grouped by artist for a given address
 * Cached for 1 hour.
 */
export async function getArtistStatsByAddress(
  address: string
): Promise<ArtistStats[]> {
  "use cache";
  cacheLife("progressStats");

  // query objekts grouped by season, member and artist in a single query
  const stats = await indexer
    .select({
      season: collections.season,
      member: collections.member,
      artist: collections.artist,
      class: collections.class,
      count: count(),
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(objekts.owner, address.toLowerCase()))
    .groupBy(
      collections.season,
      collections.member,
      collections.artist,
      collections.class
    );

  // transform stats into ArtistStats format
  const artistsMap = new Map<string, ProcessingArtistStats>();

  // process each record in the stats results
  for (const record of stats) {
    const artistName = record.artist;

    // initialize artist record if it doesn't exist
    if (!artistsMap.has(artistName)) {
      artistsMap.set(artistName, {
        artistName,
        seasons: new Map<string, number>(),
        members: new Map<string, number>(),
        classes: new Map<string, number>(),
      });
    }

    const artistStats = artistsMap.get(artistName)!;

    // update season count
    const currentSeasonCount = artistStats.seasons.get(record.season) ?? 0;
    artistStats.seasons.set(record.season, currentSeasonCount + record.count);

    // update member count
    const currentMemberCount = artistStats.members.get(record.member) ?? 0;
    artistStats.members.set(record.member, currentMemberCount + record.count);

    // update class count
    const currentClassCount = artistStats.classes.get(record.class) ?? 0;
    artistStats.classes.set(record.class, currentClassCount + record.count);
  }

  // convert the intermediate map format back to the desired final structure
  const finalStats: ArtistStats[] = Array.from(artistsMap.values()).map(
    (processingStats) => ({
      artistName: processingStats.artistName,
      seasons: Array.from(processingStats.seasons.entries()).map(
        ([name, count]) => ({ name, count })
      ),
      members: Array.from(processingStats.members.entries()).map(
        ([name, count]) => ({ name, count })
      ),
      classes: Array.from(processingStats.classes.entries()).map(
        ([name, count]) => ({ name, count })
      ),
    })
  );

  return finalStats;
}
