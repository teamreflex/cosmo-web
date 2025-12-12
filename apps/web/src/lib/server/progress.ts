import { and, count, desc, eq, not, notInArray, sql } from "drizzle-orm";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import * as z from "zod";
import { Addresses } from "@apollo/util";
import { validOnlineTypes } from "@apollo/cosmo/types/common";
import { setResponseHeader } from "@tanstack/react-start/server";
import { unobtainables } from "../unobtainables";
import { fetchKnownAddresses } from "./cosmo-accounts";
import { cacheHeaders } from "./cache";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
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
 * Cached for 1 hour.
 */
export const $fetchProgressBreakdown = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      member: z.string(),
      address: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    setResponseHeader(
      "Cache-Control",
      cacheHeaders({ cdn: 60 * 60 })["Cache-Control"],
    );

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
 * Cached for 1 hour.
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
    setResponseHeader(
      "Cache-Control",
      cacheHeaders({ cdn: 60 * 60 })["Cache-Control"],
    );

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
    setResponseHeader(
      "Cache-Control",
      cacheHeaders({ cdn: 60 * 60 })["Cache-Control"],
    );

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
const TOP_CANDIDATES = LEADERBOARD_COUNT + 10; // +10 to account for ties

/**
 * Fetch top 25 for the given member.
 */
export const fetchLeaderboard = createServerOnlyFn(
  async ({ member, onlineType, season }: FetchLeaderboard) => {
    // 1. fetch filtered collection IDs
    const filteredCollections = await indexer
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.member, member),
          notInArray(collections.class, ["Welcome", "Zero"]),
          notInArray(collections.slug, unobtainables),
          ...(onlineType !== null
            ? [eq(collections.onOffline, onlineType)]
            : []),
          ...(season !== null ? [eq(collections.season, season)] : []),
        ),
      );

    const collectionIds = filteredCollections.map((c) => c.id);
    if (collectionIds.length === 0) return [];

    // 2. fetch distinct owners per collection
    const ownersPerCollection = await indexer
      .select({
        collectionId: objekts.collectionId,
        owners: sql<string[]>`array_agg(distinct ${objekts.owner})`,
      })
      .from(objekts)
      .where(
        and(
          sql`${objekts.collectionId} IN (${sql.join(
            collectionIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          not(eq(objekts.owner, Addresses.SPIN)),
        ),
      )
      .groupBy(objekts.collectionId);

    // 3. aggregate in js - count collections per owner
    const ownerCounts = new Map<string, number>();
    for (const row of ownersPerCollection) {
      for (const owner of row.owners) {
        ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1);
      }
    }

    // 4. get top candidates
    const candidates = [...ownerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CANDIDATES);

    // 5. find which counts have ties
    const countFrequency = new Map<number, string[]>();
    for (const [owner, cnt] of candidates) {
      const list = countFrequency.get(cnt) ?? [];
      list.push(owner);
      countFrequency.set(cnt, list);
    }

    // only query addresses that are tied
    const tiedAddresses = [...countFrequency.values()]
      .filter((list) => list.length > 1)
      .flat();

    let totalObjektsMap = new Map<string, number>();

    // 6. get total objekts for tied addresses only (for tie-breaking)
    if (tiedAddresses.length > 0) {
      const totalObjektsQuery = await indexer
        .select({
          owner: objekts.owner,
          total: count().as("total"),
        })
        .from(objekts)
        .where(
          and(
            sql`${objekts.owner} IN (${sql.join(
              tiedAddresses.map((a) => sql`${a}`),
              sql`, `,
            )})`,
            sql`${objekts.collectionId} IN (${sql.join(
              collectionIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        )
        .groupBy(objekts.owner);

      totalObjektsMap = new Map(
        totalObjektsQuery.map((r) => [r.owner, r.total]),
      );
    }

    // 7. sort with tie-breaking by total objekts
    return candidates
      .map(([owner, distinctCount]) => ({
        owner,
        count: distinctCount,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        // break ties by total objekt count
        const aTotal = totalObjektsMap.get(a.owner) ?? 0;
        const bTotal = totalObjektsMap.get(b.owner) ?? 0;
        return bTotal - aTotal;
      })
      .slice(0, LEADERBOARD_COUNT);
  },
);
