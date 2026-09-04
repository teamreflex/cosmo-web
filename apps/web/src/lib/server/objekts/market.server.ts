import { remember } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import type { MarketStats } from "@/lib/universal/market";
import {
  fxRates,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

/**
 * Floor price (USD), listing count and most recent listing time for every
 * collection with at least one priced serial on a sale list. Cached briefly:
 * the market page pages through this in memory, so every page shares one
 * aggregate instead of re-scanning the entries table.
 */
export async function fetchMarketStats() {
  const rows = await remember("market-stats", 60, () => {
    const latestRates = db.$with("latest_rates").as(
      db
        .selectDistinctOn([fxRates.currency], {
          currency: fxRates.currency,
          rateToUsd: fxRates.rateToUsd,
        })
        .from(fxRates)
        .orderBy(fxRates.currency, desc(fxRates.date)),
    );

    return db
      .with(latestRates)
      .select({
        collectionId: objektListEntries.collectionId,
        floorUsd:
          sql<number>`min(${objektListEntries.price} * ${latestRates.rateToUsd})::real`.as(
            "floor_usd",
          ),
        listingCount: sql<number>`count(*)::int`.as("listing_count"),
        lastListed:
          sql<number>`(extract(epoch from max(${objektListEntries.createdAt})) * 1000)::float8`.as(
            "last_listed",
          ),
      })
      .from(objektListEntries)
      .innerJoin(
        objektLists,
        eq(objektLists.id, objektListEntries.objektListId),
      )
      .innerJoin(latestRates, eq(latestRates.currency, objektLists.currency))
      .where(
        and(
          eq(objektLists.type, "sale"),
          isNotNull(objektListEntries.tokenId),
          isNotNull(objektListEntries.price),
        ),
      )
      .groupBy(objektListEntries.collectionId);
  });

  return new Map<string, MarketStats>(rows.map((r) => [r.collectionId, r]));
}
