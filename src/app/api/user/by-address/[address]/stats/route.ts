import { env } from "@/env";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { count, eq } from "drizzle-orm";

type Props = {
  params: Promise<{
    address: string;
  }>;
};

/**
 * Endpoint for getting stats about objekts owned by an address
 */
export async function GET(req: Request, props: Props) {
  const authKey = req.headers.get("Authorization");
  if (authKey !== env.AUTH_KEY) {
    return Response.json({ error: "invalid authorization" }, { status: 401 });
  }

  const { address } = await props.params;

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

  return Response.json(finalStats);
}

type ProcessingArtistStats = {
  artistName: string;
  seasons: Map<string, number>;
  members: Map<string, number>;
  classes: Map<string, number>;
};

type ArtistStats = {
  artistName: string;
  seasons: Stat[];
  members: Stat[];
  classes: Stat[];
};

type Stat = {
  name: string;
  count: number;
};
