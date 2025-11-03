import { and, count, desc, eq, not, notInArray, sql } from "drizzle-orm";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import z from "zod";
import { Addresses } from "@apollo/util";
import { unobtainables } from "../unobtainables";
import { validOnlineTypes } from "../universal/cosmo/common";
import { remember } from "./cache";
import { fetchKnownAddresses } from "./cosmo-accounts";
import type { ValidOnlineType } from "../universal/cosmo/common";
import type {
  ArtistStats,
  LeaderboardItem,
  ProcessingArtistStats,
  SeasonMatrix,
  SeasonProgress,
} from "../universal/progress";
import type { Collection } from "@/lib/server/db/indexer/schema";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { indexer } from "@/lib/server/db/indexer";

/**
 * Fetch the progress breakdown for a given member and address.
 */
export const $fetchProgressBreakdown = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      member: z.string(),
      address: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const [totals, progress] = await Promise.all([
      fetchTotal({ member: data.member }),
      fetchProgress(data.address.toLowerCase(), data.member),
    ]);

    // dynamically build the matrix based on the data instead of hardcoding seasons and classes
    const classes = new Set<string>();
    const seasons = new Set<string>();
    for (const total of totals) {
      classes.add(total.class);
      seasons.add(total.season);
    }

    const matrix = buildMatrix(
      Array.from(classes).filter((c) => !["Zero", "Welcome"].includes(c)),
      Array.from(seasons),
    );

    return zipResults(matrix, totals, progress);
  });

/**
 * Fetch the progress leaderboard for a given member and filters.
 */
export const $fetchProgressLeaderboard = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      member: z.string(),
      onlineType: z.preprocess(
        (v) => (v === "" ? null : v),
        z.enum(validOnlineTypes).nullish().default(null),
      ),
      season: z.string().nullish().default(null),
    }),
  )
  .handler(async ({ data }) => {
    const [totals, leaderboard] = await Promise.all([
      fetchTotal(data),
      fetchLeaderboard(data),
    ]);

    // fetch profiles for each address
    const addressMap = await fetchKnownAddresses(
      leaderboard.map((a) => a.owner),
    );

    // map the nickname onto the results
    const results = leaderboard.map((row) => {
      const known = addressMap.get(row.owner.toLowerCase());

      return {
        count: row.count,
        nickname: known?.username ?? row.owner.substring(0, 8),
        address: row.owner,
        isAddress: known === undefined,
      };
    }) satisfies LeaderboardItem[];

    return {
      total: totals.filter((c) => !unobtainables.includes(c.slug)).length,
      leaderboard: results,
    };
  });

/**
 * Get objekts stats grouped by artist for a given address
 * Cached for 1 hour.
 */
export const $fetchArtistStatsByAddress = createServerFn({ method: "GET" })
  .inputValidator(z.object({ address: z.string() }))
  .handler(async ({ data }) => {
    return await remember(
      `progress-stats:${data.address}`,
      60 * 60,
      async () => {
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
          .where(eq(objekts.owner, data.address.toLowerCase()))
          .groupBy(
            collections.season,
            collections.member,
            collections.artist,
            collections.class,
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
          const currentSeasonCount =
            artistStats.seasons.get(record.season) ?? 0;
          artistStats.seasons.set(
            record.season,
            currentSeasonCount + record.count,
          );

          // update member count
          const currentMemberCount =
            artistStats.members.get(record.member) ?? 0;
          artistStats.members.set(
            record.member,
            currentMemberCount + record.count,
          );

          // update class count
          const currentClassCount = artistStats.classes.get(record.class) ?? 0;
          artistStats.classes.set(
            record.class,
            currentClassCount + record.count,
          );
        }

        // convert the intermediate map format back to the desired final structure
        const finalStats: ArtistStats[] = Array.from(artistsMap.values()).map(
          (processingStats) => ({
            artistName: processingStats.artistName,
            seasons: Array.from(processingStats.seasons.entries()).map(
              ([name, c]) => ({ name, count: c }),
            ),
            members: Array.from(processingStats.members.entries()).map(
              ([name, c]) => ({ name, count: c }),
            ),
            classes: Array.from(processingStats.classes.entries()).map(
              ([name, c]) => ({ name, count: c }),
            ),
          }),
        );

        return finalStats;
      },
    );
  });

type FetchTotal = {
  member: string;
  onlineType?: ValidOnlineType | null;
  season?: string | null;
};

/**
 * Fetch all collections for the given member.
 */
export const fetchTotal = createServerOnlyFn(
  async ({
    member,
    onlineType = null,
    season = null,
  }: FetchTotal): Promise<Collection[]> => {
    const result = await indexer
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.member, member),
          notInArray(collections.class, ["Welcome", "Zero"]),
          ...(onlineType !== null
            ? [eq(collections.onOffline, onlineType)]
            : []),
          ...(season !== null ? [eq(collections.season, season)] : []),
        ),
      )
      .orderBy(desc(collections.createdAt));

    return result;
  },
);

/**
 * Build a matrix of all available classes, seasons and online types.
 */
function buildMatrix(classes: string[], seasons: string[]): SeasonMatrix[] {
  const onlineTypes = [...validOnlineTypes, "combined"] as const;

  return onlineTypes.flatMap((type) =>
    seasons.flatMap((season) => {
      return classes.map((c) => ({
        key: `${season.toLowerCase()}_${c.toLowerCase()}_${type}`,
        season,
        type,
        class: c,
      }));
    }),
  );
}

/**
 * Fetch unique collections the user owns for given member.
 */
const fetchProgress = createServerOnlyFn(
  async (address: string, member: string) => {
    return await indexer
      // ensure we only count each collection once
      .selectDistinctOn([objekts.collectionId], {
        slug: collections.slug,
        owner: objekts.owner,
        collectionId: objekts.collectionId,
        member: collections.member,
        season: collections.season,
        class: collections.class,
        onOffline: collections.onOffline,
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(
        and(
          // only operate on objekts the address owns
          eq(objekts.owner, address),
          // only operate on objekts of the given member
          eq(collections.member, member),
        ),
      )
      .orderBy(objekts.collectionId);
  },
);

type PartialObjekt = Awaited<ReturnType<typeof fetchProgress>>;

/**
 * Merge the total and progress counts into the matrix.
 */
const zipResults = createServerOnlyFn(
  (
    matrix: SeasonMatrix[],
    total: Collection[],
    progress: PartialObjekt,
  ): SeasonProgress[] => {
    return matrix.map((m) => {
      const type = m.type === "combined" ? undefined : m.type;

      const collectionsInScope = total.filter(
        filterMatrix(m.class, m.season, type),
      );
      const ownedInScope = progress.filter(
        filterMatrix(m.class, m.season, type),
      );

      // exclude unobtainable collections from total count
      const totalCollections = collectionsInScope.filter(
        (c) => !unobtainables.includes(c.slug),
      ).length;

      // get unobtainable collections separately to be added in later
      const { progressTotal, unobtainableTotal } = ownedInScope.reduce(
        (acc, c) => {
          const isUnobtainable = unobtainables.includes(c.slug);
          acc.progressTotal += isUnobtainable ? 0 : 1;
          acc.unobtainableTotal += isUnobtainable ? 1 : 0;
          return acc;
        },
        { progressTotal: 0, unobtainableTotal: 0 },
      );

      return {
        ...m,
        total: totalCollections,
        progress: progressTotal,
        unobtainable: unobtainableTotal,
        collections: collectionsInScope.map((c) => ({
          collection: c,
          obtained: ownedInScope.some((p) => p.collectionId === c.id),
          unobtainable: unobtainables.includes(c.slug),
        })),
      };
    });
  },
);

/**
 * Helper to filter down to the matrix.
 */
const filterMatrix = createServerOnlyFn(
  <T extends { class: string; season: string; onOffline: string }>(
    matrixClass: string,
    matrixSeason: string,
    matrixOnOffline?: string,
  ) => {
    return ({ class: className, season, onOffline }: T) =>
      className === matrixClass &&
      season === matrixSeason &&
      (matrixOnOffline ? onOffline === matrixOnOffline : true);
  },
);

type FetchLeaderboard = {
  member: string;
  onlineType: ValidOnlineType | null;
  season: string | null;
};

const LEADERBOARD_COUNT = 25;

/**
 * Fetch top 25 for the given member.
 */
const fetchLeaderboard = createServerOnlyFn(
  async ({ member, onlineType, season }: FetchLeaderboard) => {
    // cte 1: filter collections to apply filters
    const filteredCollections = indexer.$with("filtered_collections").as(
      indexer
        .select({
          id: collections.id,
        })
        .from(collections)
        .where(
          and(
            eq(collections.member, member),
            // exclude welcome & zero class
            notInArray(collections.class, ["Welcome", "Zero"]),
            // exclude unobtainable collections
            notInArray(collections.slug, unobtainables),
            // apply filters
            ...(onlineType !== null
              ? [eq(collections.onOffline, onlineType)]
              : []),
            ...(season !== null ? [eq(collections.season, season)] : []),
          ),
        ),
    );

    // cte 2: filter distinct owners
    const distinctOwners = indexer.$with("distinct_owners").as(
      indexer
        .selectDistinct({
          owner: objekts.owner,
          collectionId: objekts.collectionId,
        })
        .from(objekts)
        .innerJoin(
          filteredCollections,
          eq(objekts.collectionId, filteredCollections.id),
        )
        // exclude @cosmo-spin
        .where(not(eq(objekts.owner, Addresses.SPIN))),
    );

    // final query: count distinct owners
    return await indexer
      .with(filteredCollections, distinctOwners)
      .select({
        owner: distinctOwners.owner,
        count: count(distinctOwners.collectionId).as("count"),
      })
      .from(distinctOwners)
      .groupBy(distinctOwners.owner)
      .orderBy(sql`count desc`)
      .limit(LEADERBOARD_COUNT);
  },
);
