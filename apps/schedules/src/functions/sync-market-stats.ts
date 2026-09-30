import { DatabaseWeb } from "@/db";
import { DatabaseIndexer } from "@/db-indexer";
import { collectionMarketStats } from "@apollo/database/indexer/schema";
import {
  fxRates,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { and, desc, eq, isNotNull, notExists, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Sync each collection's sale listing stats (USD floor at the latest FX rate,
 * listing count, most recent listing) from the web DB into the indexer
 * `collection_market_stats` table, where the market page joins them to
 * `collection` to filter, sort and page in a single query. Every minute, so a
 * sale list edit reaches the market within a minute.
 */
export const syncMarketStatsTask = {
  name: "sync-market-stats",
  cron: "* * * * *",
  effect: Effect.gen(function* () {
    const webDb = yield* DatabaseWeb;
    const indexerDb = yield* DatabaseIndexer;

    // an empty fx_rates would drop every collection from the aggregate and
    // empty the market, so skip the run instead
    const fxRateCount = yield* webDb.$count(fxRates);
    if (fxRateCount === 0) {
      yield* Effect.logWarning("Skipping market stats: fx_rates is empty");
      return;
    }

    const latestRates = webDb.$with("latest_rates").as(
      webDb
        .selectDistinctOn([fxRates.currency], {
          currency: fxRates.currency,
          rateToUsd: fxRates.rateToUsd,
        })
        .from(fxRates)
        .orderBy(fxRates.currency, desc(fxRates.date)),
    );

    const stats = yield* webDb
      .with(latestRates)
      .select({
        slug: objektListEntries.collectionId,
        floorUsd: sql<number>`min(${objektListEntries.price} * ${latestRates.rateToUsd})::real`,
        listingCount: sql<number>`count(*)::int`.mapWith(Number),
        // created_at is a UTC timestamp without a zone
        lastListedAt: sql<Date>`max(${objektListEntries.createdAt}) at time zone 'utc'`,
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

    // the aggregate travels as one jsonb parameter and is compared against
    // the indexer's copy there, rather than reading that copy back
    const incoming = sql`jsonb_to_recordset(${sql.param(stats)}::jsonb) as incoming(
      "slug" varchar, "floorUsd" real, "listingCount" int, "lastListedAt" timestamptz
    )`;
    const listedSlugs = sql.param(stats.map((row) => row.slug));

    const { upserted, removed } = yield* indexerDb.transaction((tx) =>
      Effect.gen(function* () {
        const upserted = yield* tx
          .insert(collectionMarketStats)
          .select(
            sql`select "slug", "floorUsd", "listingCount", "lastListedAt" from ${incoming}`,
          )
          .onConflictDoUpdate({
            target: collectionMarketStats.slug,
            set: {
              floorUsd: sql`excluded.floor_usd`,
              listingCount: sql`excluded.listing_count`,
              lastListedAt: sql`excluded.last_listed_at`,
            },
            // leave unchanged rows alone, so a quiet minute writes nothing
            setWhere: sql`(${collectionMarketStats.floorUsd}, ${collectionMarketStats.listingCount}, ${collectionMarketStats.lastListedAt})
              is distinct from (excluded.floor_usd, excluded.listing_count, excluded.last_listed_at)`,
          })
          .returning({ slug: collectionMarketStats.slug });

        const removed = yield* tx
          .delete(collectionMarketStats)
          .where(
            notExists(
              sql`(select 1 from jsonb_array_elements_text(${listedSlugs}::jsonb) as listed(slug)
                where listed.slug = ${collectionMarketStats.slug})`,
            ),
          )
          .returning({ slug: collectionMarketStats.slug });

        return { upserted, removed };
      }),
    );

    if (upserted.length > 0 || removed.length > 0) {
      yield* Effect.logInfo(
        `Synced market stats: ${upserted.length} upserted, ${removed.length} removed`,
      );
    }
  }),
} satisfies ScheduledTask;
