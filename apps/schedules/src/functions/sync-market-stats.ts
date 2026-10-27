import { DatabaseIndexer } from "@/db-indexer";
import {
  collectionMarketStats,
  collections,
} from "@apollo/database/indexer/schema";
import {
  fxRates,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { DatabaseWeb } from "@apollo/services/database-web";
import { and, desc, eq, isNotNull, notExists, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Sync each collection's sale listing stats (USD floor at the latest FX rate,
 * listing count, most recent listing) from the web DB into the indexer's
 * `collection_market_stats`, where the market page joins them to `collection`
 * to filter, sort and page in a single query. Every minute, so a sale list
 * edit reaches the market within a minute.
 */
export const syncMarketStatsTask = {
  name: "sync-market-stats",
  cron: "* * * * *",
  effect: Effect.gen(function* () {
    const webDb = yield* DatabaseWeb;
    const indexerDb = yield* DatabaseIndexer;

    // an empty fx_rates would drop every collection from the aggregate and
    // empty the market, so skip the run instead
    const [anyRate] = yield* webDb
      .select({ currency: fxRates.currency })
      .from(fxRates)
      .limit(1);
    if (anyRate === undefined) {
      yield* Effect.logWarning("Skipping market stats: fx_rates is empty");
      return;
    }

    // one index probe per list currency, rather than reading the whole rate history
    const rate = webDb
      .select({ rateToUsd: fxRates.rateToUsd })
      .from(fxRates)
      .where(eq(fxRates.currency, objektLists.currency))
      .orderBy(desc(fxRates.date))
      .limit(1)
      .as("rate");

    // grouping needs no linguistic order, and sorting by the default collation costs several times more
    const slug = sql<string>`${objektListEntries.collectionId} collate "C"`;

    const stats = yield* webDb
      .select({
        slug,
        floorUsd: sql<number>`min(${objektListEntries.price} * ${rate.rateToUsd})::real`,
        listingCount: sql<number>`count(*)::int`.mapWith(Number),
        // created_at is a UTC timestamp without a zone
        lastListedAt: sql<Date>`max(${objektListEntries.createdAt}) at time zone 'utc'`,
      })
      .from(objektListEntries)
      .innerJoin(
        objektLists,
        eq(objektLists.id, objektListEntries.objektListId),
      )
      .crossJoinLateral(rate)
      .where(
        and(
          eq(objektLists.type, "sale"),
          isNotNull(objektListEntries.tokenId),
          isNotNull(objektListEntries.price),
        ),
      )
      .groupBy(slug);

    /**
     * The aggregate travels as one jsonb parameter, keyed by collection id
     * through the slug, and is compared against the indexer's copy there
     * rather than reading that copy back.
     */
    const incoming = sql`(
      select ${collections.id} as "collection_id", i."floorUsd", i."listingCount", i."lastListedAt"
      from jsonb_to_recordset(${sql.param(stats)}::jsonb) as i(
        "slug" text, "floorUsd" real, "listingCount" int, "lastListedAt" timestamptz
      )
      join ${collections} on ${collections.slug} = i."slug"
    ) as incoming`;

    const { upserted, removed } = yield* indexerDb.transaction((tx) =>
      Effect.gen(function* () {
        const upserted = yield* tx
          .insert(collectionMarketStats)
          .select(
            sql`select "collection_id", "floorUsd", "listingCount", "lastListedAt" from ${incoming}`,
          )
          .onConflictDoUpdate({
            target: collectionMarketStats.collectionId,
            set: {
              floorUsd: sql`excluded.floor_usd`,
              listingCount: sql`excluded.listing_count`,
              lastListedAt: sql`excluded.last_listed_at`,
            },
            // leave unchanged rows alone, so a quiet minute writes nothing
            setWhere: sql`(${collectionMarketStats.floorUsd}, ${collectionMarketStats.listingCount}, ${collectionMarketStats.lastListedAt})
              is distinct from (excluded.floor_usd, excluded.listing_count, excluded.last_listed_at)`,
          })
          .returning({ collectionId: collectionMarketStats.collectionId });

        const removed = yield* tx
          .delete(collectionMarketStats)
          .where(
            notExists(
              sql`(select 1 from ${incoming} where incoming."collection_id" = ${collectionMarketStats.collectionId})`,
            ),
          )
          .returning({ collectionId: collectionMarketStats.collectionId });

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
