import { db } from "@/lib/server/db";
import type { MarketStats } from "@/lib/universal/market";
import {
  collectionPriceStats,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { and, count, eq, inArray, isNotNull, min } from "drizzle-orm";
import { fetchLatestFxRates } from "./fx.server";

/**
 * Floor price (USD, at the latest FX rate) and listing count of each given
 * collection's priced sale listings, across every seller.
 */
export async function fetchMarketStats(slugs: string[]) {
  if (slugs.length === 0) {
    return new Map<string, MarketStats>();
  }

  const rows = await db
    .select({
      collectionId: objektListEntries.collectionId,
      currency: objektLists.currency,
      minPrice: min(objektListEntries.price),
      listingCount: count(),
    })
    .from(objektListEntries)
    .innerJoin(objektLists, eq(objektLists.id, objektListEntries.objektListId))
    .where(
      and(
        inArray(objektListEntries.collectionId, slugs),
        eq(objektLists.type, "sale"),
        isNotNull(objektListEntries.tokenId),
        isNotNull(objektListEntries.price),
      ),
    )
    .groupBy(objektListEntries.collectionId, objektLists.currency);

  const rates = await fetchLatestFxRates([
    ...new Set(rows.flatMap((r) => (r.currency === null ? [] : [r.currency]))),
  ]);

  const stats = new Map<string, MarketStats>();
  for (const row of rows) {
    const rate = row.currency === null ? undefined : rates.get(row.currency);
    if (rate === undefined || row.minPrice === null) continue;
    // rounded to real, as the market stats sync stores its floors
    const floorUsd = Math.fround(row.minPrice * rate);
    const current = stats.get(row.collectionId);
    stats.set(row.collectionId, {
      floorUsd: Math.min(current?.floorUsd ?? floorUsd, floorUsd),
      listingCount: (current?.listingCount ?? 0) + row.listingCount,
    });
  }
  return stats;
}

/**
 * Floors and medians are stored as `real`, so comparisons against them allow
 * for float4 rounding.
 */
const REAL_TOLERANCE = 1 + 1e-6;

/**
 * Whether a USD price matches its collection's market floor. A sole listing
 * is trivially the floor, so it only counts when there are other listings.
 */
export function isFloorPrice(priceUsd: number, stats: MarketStats | undefined) {
  return (
    stats !== undefined &&
    stats.listingCount > 1 &&
    priceUsd <= stats.floorUsd * REAL_TOLERANCE
  );
}

/**
 * Whether a USD price is above its collection's median.
 */
export function isAboveMedian(priceUsd: number, medianUsd: number | undefined) {
  return medianUsd !== undefined && priceUsd > medianUsd * REAL_TOLERANCE;
}

/**
 * USD median price per collection from the price stats job, which refreshes
 * every 4 hours. Collections without priced listings are absent.
 */
export async function fetchMedianPrices(slugs: string[]) {
  if (slugs.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      collectionId: collectionPriceStats.collectionId,
      medianPriceUsd: collectionPriceStats.medianPriceUsd,
    })
    .from(collectionPriceStats)
    .where(inArray(collectionPriceStats.collectionId, slugs));

  return new Map(rows.map((r) => [r.collectionId, r.medianPriceUsd]));
}
