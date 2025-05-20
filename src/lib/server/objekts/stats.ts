import { and, eq, gte, lt, sql } from "drizzle-orm";
import { collections, objekts } from "../db/indexer/schema";
import { indexer } from "../db/indexer";
import type { HourlyBreakdown, ObjektStats } from "@/lib/universal/stats";
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";

interface RawStats {
  timestamp: string;
  member: string;
  artist: string;
  count: number;
}

/**
 * Get the start and end of the current 24-hour window.
 * The window ends at the most recent hour boundary.
 */
function get24HourWindow() {
  const now = new Date();
  const end = new Date(now);
  end.setMinutes(0, 0, 0);

  const start = new Date(end);
  start.setHours(start.getHours() - 24);

  return { start, end };
}

/**
 * Generate an array of hour timestamps for the 24-hour window.
 */
function timestamps(): string[] {
  const { start } = get24HourWindow();
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(start);
    d.setHours(d.getHours() + i);
    return d.toISOString();
  });
}

/**
 * Initialize the breakdown with zero counts.
 */
function initializeBreakdown(referenceHours: string[]): HourlyBreakdown[] {
  return referenceHours.map((timestamp) => ({
    timestamp,
    count: 0,
  }));
}

/**
 * Get hourly stats for the given date range.
 */
async function getHourlyStats(since: Date, until: Date): Promise<RawStats[]> {
  const stats = await indexer
    .select({
      timestamp: sql<string>`date_trunc('hour', ${objekts.mintedAt})::text`,
      member: collections.member,
      artist: collections.artist,
      count: sql<number>`count(*)::int`,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        gte(objekts.mintedAt, since.toISOString()),
        lt(objekts.mintedAt, until.toISOString())
      )
    )
    .groupBy(
      sql`date_trunc('hour', ${objekts.mintedAt})`,
      collections.member,
      collections.artist
    );

  return stats;
}

/**
 * Get counts for Premier digital PCOs and scanned objekts in the given date range.
 */
async function getObjektCounts(
  since: Date,
  until: Date
): Promise<{
  premierCount: number;
  scannedCount: number;
}> {
  const result = await indexer
    .select({
      premierCount: sql<number>`sum(case when ${collections.class} = 'Premier' and ${collections.onOffline} = 'online' then 1 else 0 end)::int`,
      scannedCount: sql<number>`sum(case when ${collections.onOffline} = 'offline' then 1 else 0 end)::int`,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        gte(objekts.mintedAt, since.toISOString()),
        lt(objekts.mintedAt, until.toISOString())
      )
    );

  return {
    premierCount: result?.[0]?.premierCount ?? 0,
    scannedCount: result?.[0]?.scannedCount ?? 0,
  };
}

/**
 * Process the raw stats and return the hourly breakdowns.
 */
function processRawStats(rawStats: RawStats[], referenceHours: string[]) {
  const memberBreakdown: Record<string, HourlyBreakdown[]> = {};
  const artistBreakdown: Record<string, HourlyBreakdown[]> = {};
  let totalCount = 0;

  // initialize breakdowns with zero counts
  for (const stat of rawStats) {
    if (!memberBreakdown[stat.member]) {
      memberBreakdown[stat.member] = initializeBreakdown(referenceHours);
    }
    if (!artistBreakdown[stat.artist]) {
      artistBreakdown[stat.artist] = initializeBreakdown(referenceHours);
    }
  }

  // fill in data
  for (const stat of rawStats) {
    totalCount += stat.count;

    const statDate = new Date(stat.timestamp);
    const hourIndex = referenceHours.findIndex((h) => {
      const referenceDate = new Date(h);
      return (
        referenceDate.getFullYear() === statDate.getFullYear() &&
        referenceDate.getMonth() === statDate.getMonth() &&
        referenceDate.getDate() === statDate.getDate() &&
        referenceDate.getHours() === statDate.getHours()
      );
    });

    if (hourIndex !== -1) {
      memberBreakdown[stat.member][hourIndex].count += stat.count;
      artistBreakdown[stat.artist][hourIndex].count += stat.count;
    }
  }

  return {
    memberBreakdown,
    artistBreakdown,
    totalCount,
  };
}

/**
 * Get the stats for the fixed 24-hour window.
 * Cached for 2 hours, but a cron job flushes the cache every hour.
 */
export async function fetchObjektStats(): Promise<ObjektStats> {
  "use cache: remote";
  cacheLife("objektStats");
  cacheTag("objekt-stats");

  const { start, end } = get24HourWindow();
  const hourlyTimestamps = timestamps();

  const [rawStats, { premierCount, scannedCount }] = await Promise.all([
    getHourlyStats(start, end),
    getObjektCounts(start, end),
  ]);

  return {
    ...processRawStats(rawStats, hourlyTimestamps),
    premierCount,
    scannedCount,
  };
}
