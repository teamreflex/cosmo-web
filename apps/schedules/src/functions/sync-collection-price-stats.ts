import {
  collectionPriceHistory,
  collectionPriceStats,
  fxRates,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { DatabaseWeb } from "@apollo/services/database-web";
import { and, count, desc, eq, isNotNull, notExists, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Recompute per-collection USD median prices from priced entries across every
 * objekt list, upserting into `collection_price_stats` and evicting rows for
 * collections that no longer have any priced listings. The surviving rows are
 * then copied into `collection_price_history` under today's UTC date, and
 * today's rows for evicted collections are dropped, so the last run of the
 * day is the day's snapshot.
 */
export const syncCollectionPriceStatsTask = {
  name: "sync-collection-price-stats",
  cron: "0 */4 * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseWeb;

    // if FX rates are empty, skip this run instead of evicting
    // every row in collection_price_stats. protects against a long FX outage.
    const [anyRate] = yield* db
      .select({ currency: fxRates.currency })
      .from(fxRates)
      .limit(1);

    if (anyRate === undefined) {
      yield* Effect.logWarning("Skipping price stats: fx_rates is empty");
      return;
    }

    const today = sql<string>`(now() at time zone 'utc')::date`;

    yield* db.transaction((tx) =>
      Effect.gen(function* () {
        // one index probe per list currency, rather than reading the whole rate history
        const rate = tx
          .select({ rateToUsd: fxRates.rateToUsd })
          .from(fxRates)
          .where(eq(fxRates.currency, objektLists.currency))
          .orderBy(desc(fxRates.date))
          .limit(1)
          .as("rate");

        const priced = tx.$with("priced").as(
          tx
            .select({
              collectionId: objektListEntries.collectionId,
              priceUsd:
                sql<number>`(${objektListEntries.price} * ${rate.rateToUsd})::real`.as(
                  "price_usd",
                ),
            })
            .from(objektListEntries)
            .innerJoin(
              objektLists,
              eq(objektLists.id, objektListEntries.objektListId),
            )
            .crossJoinLateral(rate)
            .where(
              and(
                isNotNull(objektListEntries.price),
                isNotNull(objektListEntries.tokenId),
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

        yield* tx
          .with(priced, agg)
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

        yield* tx.delete(collectionPriceStats).where(
          notExists(
            tx
              .select({ one: sql`1` })
              .from(objektListEntries)
              .innerJoin(
                objektLists,
                eq(objektLists.id, objektListEntries.objektListId),
              )
              .crossJoinLateral(rate)
              .where(
                and(
                  eq(
                    objektListEntries.collectionId,
                    collectionPriceStats.collectionId,
                  ),
                  isNotNull(objektListEntries.price),
                  isNotNull(objektListEntries.tokenId),
                  isNotNull(objektLists.currency),
                ),
              ),
          ),
        );

        yield* tx
          .insert(collectionPriceHistory)
          .select(
            tx
              .select({
                collectionId: collectionPriceStats.collectionId,
                date: sql<string>`${today}`.as("date"),
                floorUsd: collectionPriceStats.minPriceUsd,
                medianUsd: collectionPriceStats.medianPriceUsd,
                listingCount: collectionPriceStats.listingCount,
              })
              .from(collectionPriceStats),
          )
          .onConflictDoUpdate({
            target: [
              collectionPriceHistory.collectionId,
              collectionPriceHistory.date,
            ],
            set: {
              floorUsd: sql`excluded.floor_usd`,
              medianUsd: sql`excluded.median_usd`,
              listingCount: sql`excluded.listing_count`,
            },
            // most runs change nothing, so skip rewriting those rows
            setWhere: sql`(${collectionPriceHistory.floorUsd}, ${collectionPriceHistory.medianUsd}, ${collectionPriceHistory.listingCount}) is distinct from (excluded.floor_usd, excluded.median_usd, excluded.listing_count)`,
          });

        // a collection delisted since an earlier run today has no snapshot
        yield* tx.delete(collectionPriceHistory).where(
          and(
            eq(collectionPriceHistory.date, today),
            notExists(
              tx
                .select({ one: sql`1` })
                .from(collectionPriceStats)
                .where(
                  eq(
                    collectionPriceStats.collectionId,
                    collectionPriceHistory.collectionId,
                  ),
                ),
            ),
          ),
        );
      }),
    );

    yield* Effect.logInfo("Synced collection price stats");
  }),
} satisfies ScheduledTask;
