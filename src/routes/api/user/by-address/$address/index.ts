import { createFileRoute } from "@tanstack/react-router";
import { count, eq } from "drizzle-orm";
import { env } from "@/env";
import { fetchObjektsWithComo } from "@/lib/server/como";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { buildCalendar } from "@/lib/universal/como";

export const Route = createFileRoute("/api/user/by-address/$address/")({
  server: {
    handlers: {
      /**
       * Endpoint for getting the COMO calendar for a given address.
       */
      GET: async ({ request, params }) => {
        const authKey = request.headers.get("Authorization");
        if (authKey !== env.AUTH_KEY) {
          return Response.json(
            { error: "invalid authorization" },
            { status: 401 }
          );
        }

        const url = new URL(request.url);
        const now = url.searchParams.get("now");

        const [account, calendar, stats] = await Promise.all([
          getCosmoAccount(params.address),
          getCalendar(params.address, now),
          getObjektStats(params.address),
        ]);

        return Response.json({ account, calendar, stats });
      },
    },
  },
});

/**
 * Get the cosmo account for a given Abstract address.
 */
async function getCosmoAccount(address: string) {
  return await db.query.cosmoAccounts.findFirst({
    where: { address },
    columns: {
      id: false,
      userId: false,
      cosmoId: false,
    },
  });
}

/**
 * Get the COMO calendar for a given address.
 */
async function getCalendar(address: string, now: string | null) {
  // parse unix timestamp (supports both seconds and milliseconds)
  const timestamp = now ? parseInt(now) : new Date().getTime();
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);

  const result = await fetchObjektsWithComo(address);
  return buildCalendar(date, result);
}

/**
 * Get the stats for the objekts owned by an address.
 */
async function getObjektStats(address: string) {
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
  return Array.from(artistsMap.values()).map((processingStats) => ({
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
  })) satisfies ArtistStats[];
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
