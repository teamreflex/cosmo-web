import { fetchKnownAddresses } from "@/lib/server/cosmo-accounts.server";
import { indexer } from "@/lib/server/db/indexer";
import {
  countObtainable,
  fetchLeaderboard,
  fetchProgress,
  fetchTotal,
} from "@/lib/server/progress.server";
import type {
  ArtistStats,
  LeaderboardItem,
  MemberCompletion,
  ObjektProgression,
  ProcessingArtistStats,
  ProgressRank,
} from "@/lib/universal/progress";
import { validOnlineTypes } from "@apollo/cosmo/types/common";
import {
  collections,
  objekts,
  progressHistogram,
  progressLeaderboard,
} from "@apollo/database/indexer/schema";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import {
  and,
  arrayOverlaps,
  count,
  eq,
  inArray,
  notInArray,
  sql,
} from "drizzle-orm";
import * as z from "zod";

/**
 * Fetch every collection of a member that progress counts, each marked with
 * whether the address owns it.
 */
export const $fetchProgressBreakdown = createServerFn({ method: "GET" })
  .validator(
    z.object({
      member: z.string(),
      address: z.string(),
    }),
  )
  .handler(async ({ data }): Promise<ObjektProgression[]> => {
    // SPIN holds millions of objekts, so its progress isn't supported
    if (isEqual(data.address, Addresses.SPIN)) {
      return [];
    }

    const totals = await fetchTotal(data.member);
    const progress = await fetchProgress(
      data.address.toLowerCase(),
      data.member,
    );

    const owned = new Set(progress.map((p) => p.collectionId));
    return totals.map((collection) => ({
      collection,
      obtained: owned.has(collection.id),
    }));
  });

/**
 * Fetch the progress leaderboard for a given member and filters.
 */
export const $fetchProgressLeaderboard = createServerFn({ method: "GET" })
  .validator(
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
    const total = await countObtainable(data);
    const leaderboard = await fetchLeaderboard(data);

    // fetch profiles for each address
    const addressMap = await fetchKnownAddresses(
      leaderboard.map((a) => a.owner),
    );

    // map the nickname onto the results
    const results = leaderboard.map((row) => {
      const known = addressMap.get(row.owner.toLowerCase());

      return {
        // ties share the rank of the first row with their count, as $fetchProgressRank counts
        rank: leaderboard.findIndex((r) => r.count === row.count) + 1,
        count: row.count,
        nickname: known?.username ?? row.owner.substring(0, 8),
        address: row.owner,
        isAddress: known === undefined,
      };
    }) satisfies LeaderboardItem[];

    return {
      total,
      leaderboard: results,
    };
  });

/**
 * Fetch where an address places on a member's leaderboard for the given filters.
 */
export const $fetchProgressRank = createServerFn({ method: "GET" })
  .validator(
    z.object({
      address: z.string(),
      member: z.string(),
      onlineType: z.enum(validOnlineTypes).nullish().default(null),
      season: z.string().nullish().default(null),
    }),
  )
  .handler(async ({ data }): Promise<ProgressRank | null> => {
    if (isEqual(data.address, Addresses.SPIN)) {
      return null;
    }

    // the owner's count against the histogram of every count, so ties share a rank
    const [standing] = await indexer
      .select({
        count: progressLeaderboard.count,
        collectors: sql<number>`sum(${progressHistogram.owners})`.mapWith(
          Number,
        ),
        above:
          sql<number>`coalesce(sum(${progressHistogram.owners}) filter (where ${progressHistogram.count} > ${progressLeaderboard.count}), 0)`.mapWith(
            Number,
          ),
      })
      .from(progressLeaderboard)
      .innerJoin(
        progressHistogram,
        and(
          eq(progressHistogram.member, progressLeaderboard.member),
          eq(progressHistogram.season, progressLeaderboard.season),
          eq(progressHistogram.onOffline, progressLeaderboard.onOffline),
        ),
      )
      .where(
        and(
          eq(progressLeaderboard.member, data.member),
          eq(progressLeaderboard.season, data.season ?? ""),
          eq(progressLeaderboard.onOffline, data.onlineType ?? ""),
          eq(progressLeaderboard.owner, data.address.toLowerCase()),
        ),
      )
      .groupBy(progressLeaderboard.count)
      .comment({ fn: "fetchProgressRank" });

    // no collections of the member for the filters
    if (standing === undefined) {
      return null;
    }

    return {
      rank: standing.above + 1,
      collectors: standing.collectors,
      count: standing.count,
    };
  });

/**
 * Fetch an address's completion of every member it holds collections of.
 */
export const $fetchMemberCompletion = createServerFn({ method: "GET" })
  .validator(z.object({ address: z.string() }))
  .handler(async ({ data }): Promise<MemberCompletion[]> => {
    if (isEqual(data.address, Addresses.SPIN)) {
      return [];
    }

    const owned = await indexer
      .select({
        member: progressLeaderboard.member,
        count: progressLeaderboard.count,
      })
      .from(progressLeaderboard)
      .where(
        and(
          eq(progressLeaderboard.owner, data.address.toLowerCase()),
          eq(progressLeaderboard.season, ""),
          eq(progressLeaderboard.onOffline, ""),
        ),
      )
      .comment({ fn: "fetchMemberCompletion" });

    if (owned.length === 0) {
      return [];
    }

    // the same collections progress_leaderboard counts, once per member
    const counted = indexer
      .select({
        member: sql<string>`unnest(${collections.members})`.as("member"),
      })
      .from(collections)
      .where(
        and(
          arrayOverlaps(
            collections.members,
            owned.map((row) => row.member),
          ),
          notInArray(collections.class, ["Welcome", "Zero"]),
          eq(collections.unobtainable, false),
        ),
      )
      .as("counted");
    const totals = await indexer
      .select({ member: counted.member, total: count() })
      .from(counted)
      .where(
        inArray(
          counted.member,
          owned.map((row) => row.member),
        ),
      )
      .groupBy(counted.member)
      .comment({ fn: "fetchMemberCompletion" });

    const totalMap = new Map(totals.map((row) => [row.member, row.total]));
    return owned.map((row) => ({
      member: row.member,
      count: row.count,
      total: totalMap.get(row.member) ?? row.count,
    }));
  });

/**
 * Get objekts stats grouped by artist for a given address
 */
export const $fetchArtistStatsByAddress = createServerFn({ method: "GET" })
  .validator(z.object({ address: z.string() }))
  .handler(async ({ data }): Promise<ArtistStats[]> => {
    if (isEqual(data.address, Addresses.SPIN)) {
      return [];
    }

    const stats = await indexer
      .select({
        season: collections.season,
        members: collections.members,
        artist: collections.artist,
        class: collections.class,
        count: count(),
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(eq(objekts.owner, data.address.toLowerCase()))
      .groupBy(
        collections.season,
        collections.members,
        collections.artist,
        collections.class,
      )
      .comment({ fn: "fetchArtistStatsByAddress" });

    // transform stats into ArtistStats format
    const artistsMap = new Map<string, ProcessingArtistStats>();

    // process each record in the stats results
    for (const record of stats) {
      const artistName = record.artist;

      // initialize artist record if it doesn't exist
      let artistStats = artistsMap.get(artistName);
      if (!artistStats) {
        artistStats = {
          artistName,
          seasons: new Map<string, number>(),
          members: new Map<string, number>(),
          classes: new Map<string, number>(),
        };
        artistsMap.set(artistName, artistStats);
      }

      // update season count
      const currentSeasonCount = artistStats.seasons.get(record.season) ?? 0;
      artistStats.seasons.set(record.season, currentSeasonCount + record.count);

      // update the count of each member the collection names
      for (const member of record.members) {
        const currentMemberCount = artistStats.members.get(member) ?? 0;
        artistStats.members.set(member, currentMemberCount + record.count);
      }

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
