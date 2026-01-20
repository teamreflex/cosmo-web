import type { HourlyBreakdown, ObjektStats } from "@/lib/universal/stats";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { remember } from "../cache";
import { indexer } from "../db/indexer";
import { collections, objekts } from "../db/indexer/schema";

interface RawStats {
  timestamp: string;
  member: string;
  artist: string;
  count: number;
  premierCount: number;
  scannedCount: number;
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
 * Groups by hour, member, and artist while using filtered
 * aggregates to compute totals in a single query.
 */
async function getHourlyStats(since: Date, until: Date): Promise<RawStats[]> {
  return indexer
    .select({
      timestamp: sql<string>`date_trunc('hour', ${objekts.mintedAt})::text`,
      member: collections.member,
      artist: collections.artist,
      count: count(),
      premierCount: sql`
        sum(
          case
            when ${collections.class} = 'Premier'
              and ${collections.onOffline} = 'online'
            then 1
            else 0
          end
        )
      `.mapWith(Number),
      scannedCount: sql`
        sum(case when ${collections.onOffline} = 'offline' then 1 else 0 end)
      `.mapWith(Number),
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        gte(objekts.mintedAt, since.toISOString()),
        lt(objekts.mintedAt, until.toISOString()),
      ),
    )
    .groupBy(
      sql`date_trunc('hour', ${objekts.mintedAt})`,
      collections.member,
      collections.artist,
    );
}

/**
 * Process the raw stats and return all computed values.
 */
function processRawStats(
  rawStats: RawStats[],
  referenceHours: string[],
): ObjektStats {
  const memberBreakdown: Record<string, HourlyBreakdown[]> = {};
  const artistBreakdown: Record<string, HourlyBreakdown[]> = {};
  let totalCount = 0;
  let premierCount = 0;
  let scannedCount = 0;

  // Build a map for O(1) hour index lookups
  const hourIndexMap = new Map<string, number>();
  for (let i = 0; i < referenceHours.length; i++) {
    const d = new Date(referenceHours[i]!);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    hourIndexMap.set(key, i);
  }

  // Initialize breakdowns and compute stats in a single pass
  for (const stat of rawStats) {
    // Initialize breakdown arrays if needed
    memberBreakdown[stat.member] ??= initializeBreakdown(referenceHours);
    artistBreakdown[stat.artist] ??= initializeBreakdown(referenceHours);

    // Accumulate counts
    totalCount += stat.count;
    premierCount += stat.premierCount;
    scannedCount += stat.scannedCount;

    // Find hour index and update breakdowns
    const statDate = new Date(stat.timestamp);
    const hourKey = `${statDate.getFullYear()}-${statDate.getMonth()}-${statDate.getDate()}-${statDate.getHours()}`;
    const hourIndex = hourIndexMap.get(hourKey);

    if (hourIndex !== undefined) {
      memberBreakdown[stat.member]![hourIndex]!.count += stat.count;
      artistBreakdown[stat.artist]![hourIndex]!.count += stat.count;
    }
  }

  return {
    memberBreakdown,
    artistBreakdown,
    totalCount,
    premierCount,
    scannedCount,
  };
}

/**
 * Get the stats for the fixed 24-hour window.
 * Cached for 2 hours, but a cron job flushes the cache every hour.
 */
export const $fetchObjektStats = createServerFn({ method: "GET" }).handler(() =>
  remember(`objekt-stats`, 60 * 60 * 2, async (): Promise<ObjektStats> => {
    const { start, end } = get24HourWindow();
    const hourlyTimestamps = timestamps();
    const rawStats = await getHourlyStats(start, end);
    return processRawStats(rawStats, hourlyTimestamps);
  }),
);
