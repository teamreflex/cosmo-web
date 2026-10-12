import { db } from "@/lib/server/db";
import type { MarketStats } from "@/lib/universal/market";
import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import { and, count, eq, inArray, isNotNull, min, sql } from "drizzle-orm";
import { fetchLatestFxRates } from "./fx.server";

/**
 * Floor price (USD, at the latest FX rate), listing count and seller count of
 * each given collection's priced sale listings, across every seller.
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
      sellerIds: sql<string[]>`array_agg(distinct ${objektLists.userId})`,
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
  // a seller with lists in two currencies appears in two rows
  const sellers = new Map<string, Set<string>>();
  for (const row of rows) {
    const rate = row.currency === null ? undefined : rates.get(row.currency);
    if (rate === undefined || row.minPrice === null) continue;
    // rounded to real, as the price stats job stores its floors
    const floorUsd = Math.fround(row.minPrice * rate);
    const current = stats.get(row.collectionId);
    const sellerIds = new Set([
      ...(sellers.get(row.collectionId) ?? []),
      ...row.sellerIds,
    ]);
    sellers.set(row.collectionId, sellerIds);
    stats.set(row.collectionId, {
      floorUsd: Math.min(current?.floorUsd ?? floorUsd, floorUsd),
      listingCount: (current?.listingCount ?? 0) + row.listingCount,
      sellerCount: sellerIds.size,
    });
  }
  return stats;
}

/**
 * Floors are stored as `real`, so comparisons against them allow for float4
 * rounding.
 */
const REAL_TOLERANCE = 1 + 1e-6;

/**
 * Whether a USD price matches its collection's market floor. A lone seller's
 * listings are trivially the floor, so it only counts when another seller
 * prices the collection too.
 */
export function isFloorPrice(priceUsd: number, stats: MarketStats | undefined) {
  return (
    stats !== undefined &&
    stats.sellerCount > 1 &&
    priceUsd <= stats.floorUsd * REAL_TOLERANCE
  );
}
