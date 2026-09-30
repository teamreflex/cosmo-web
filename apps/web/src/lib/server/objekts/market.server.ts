import { db } from "@/lib/server/db";
import type { MarketStats } from "@/lib/universal/market";
import {
  collectionPriceStats,
  fxRates,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

/**
 * Floor price (USD, at the latest FX rate) and listing count of each given
 * collection's priced sale listings, across every seller. Collections without
 * any are absent. Computed live rather than read from the market's synced
 * copy in the indexer, so a sale list reflects its own edits immediately.
 */
export async function fetchMarketStats(slugs: string[]) {
  if (slugs.length === 0) {
    return new Map<string, MarketStats>();
  }

  const latestRates = db.$with("latest_rates").as(
    db
      .selectDistinctOn([fxRates.currency], {
        currency: fxRates.currency,
        rateToUsd: fxRates.rateToUsd,
      })
      .from(fxRates)
      .orderBy(fxRates.currency, desc(fxRates.date)),
  );

  const rows = await db
    .with(latestRates)
    .select({
      collectionId: objektListEntries.collectionId,
      floorUsd: sql<number>`min(${objektListEntries.price} * ${latestRates.rateToUsd})::real`,
      listingCount: count(),
    })
    .from(objektListEntries)
    .innerJoin(objektLists, eq(objektLists.id, objektListEntries.objektListId))
    .innerJoin(latestRates, eq(latestRates.currency, objektLists.currency))
    .where(
      and(
        inArray(objektListEntries.collectionId, slugs),
        eq(objektLists.type, "sale"),
        isNotNull(objektListEntries.tokenId),
        isNotNull(objektListEntries.price),
      ),
    )
    .groupBy(objektListEntries.collectionId);

  return new Map<string, MarketStats>(rows.map((r) => [r.collectionId, r]));
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
