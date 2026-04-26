import { DatabaseWeb } from "@/db";
import {
  collectionPriceStats,
  fxRates,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { and, count, desc, eq, isNotNull, notExists, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Recompute per-collection USD median prices from priced entries across every
 * objekt list, upserting into `collection_price_stats` and evicting rows for
 * collections that no longer have any priced listings.
 */
export const syncCollectionPriceStatsTask = {
  name: "sync-collection-price-stats",
  cron: "0 */4 * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseWeb;

    // if FX rates are empty, skip this run instead of evicting
    // every row in collection_price_stats. protects against a long FX outage.
    const fxRateCount = yield* Effect.tryPromise({
      try: () => db.$count(fxRates),
      catch: (cause) => new SyncStatsError({ cause }),
    });

    if (fxRateCount === 0) {
      yield* Effect.logWarning("Skipping price stats: fx_rates is empty");
      return;
    }

    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const latestRates = tx.$with("latest_rates").as(
            tx
              .selectDistinctOn([fxRates.currency], {
                currency: fxRates.currency,
                rateToUsd: fxRates.rateToUsd,
              })
              .from(fxRates)
              .orderBy(fxRates.currency, desc(fxRates.date)),
          );

          const priced = tx.$with("priced").as(
            tx
              .select({
                collectionId: objektListEntries.collectionId,
                priceUsd:
                  sql<number>`(${objektListEntries.price} * ${latestRates.rateToUsd})::real`.as(
                    "price_usd",
                  ),
              })
              .from(objektListEntries)
              .innerJoin(
                objektLists,
                eq(objektLists.id, objektListEntries.objektListId),
              )
              .innerJoin(
                latestRates,
                eq(latestRates.currency, objektLists.currency),
              )
              .where(
                and(
                  isNotNull(objektListEntries.price),
                  isNotNull(objektLists.currency),
                ),
              ),
          );

          const agg = tx.$with("agg").as(
            tx
              .select({
                collectionId: priced.collectionId,
                medianPriceUsd:
                  sql<number>`(percentile_cont(0.5) within group (order by ${priced.priceUsd}))::real`.as(
                    "median_price_usd",
                  ),
                listingCount: count().as("listing_count"),
                minPriceUsd: sql<number>`min(${priced.priceUsd})::real`.as(
                  "min_price_usd",
                ),
                maxPriceUsd: sql<number>`max(${priced.priceUsd})::real`.as(
                  "max_price_usd",
                ),
              })
              .from(priced)
              .groupBy(priced.collectionId),
          );

          await tx
            .with(latestRates, priced, agg)
            .insert(collectionPriceStats)
            .select(
              tx
                .select({
                  collectionId: agg.collectionId,
                  medianPriceUsd: agg.medianPriceUsd,
                  listingCount: agg.listingCount,
                  minPriceUsd: agg.minPriceUsd,
                  maxPriceUsd: agg.maxPriceUsd,
                  updatedAt: sql<Date>`now()`.as("updated_at"),
                })
                .from(agg),
            )
            .onConflictDoUpdate({
              target: collectionPriceStats.collectionId,
              set: {
                medianPriceUsd: sql`excluded.median_price_usd`,
                listingCount: sql`excluded.listing_count`,
                minPriceUsd: sql`excluded.min_price_usd`,
                maxPriceUsd: sql`excluded.max_price_usd`,
                updatedAt: sql`excluded.updated_at`,
              },
            });

          await tx
            .with(latestRates)
            .delete(collectionPriceStats)
            .where(
              notExists(
                tx
                  .select({ one: sql`1` })
                  .from(objektListEntries)
                  .innerJoin(
                    objektLists,
                    eq(objektLists.id, objektListEntries.objektListId),
                  )
                  .innerJoin(
                    latestRates,
                    eq(latestRates.currency, objektLists.currency),
                  )
                  .where(
                    and(
                      eq(
                        objektListEntries.collectionId,
                        collectionPriceStats.collectionId,
                      ),
                      isNotNull(objektListEntries.price),
                      isNotNull(objektLists.currency),
                    ),
                  ),
              ),
            );
        }),
      catch: (cause) => new SyncStatsError({ cause }),
    });

    yield* Effect.logInfo("Synced collection price stats");
  }),
} satisfies ScheduledTask;

/**
 * Failed to sync collection price stats.
 */
export class SyncStatsError extends Data.TaggedError("SyncStatsError")<{
  readonly cause: unknown;
}> {}
