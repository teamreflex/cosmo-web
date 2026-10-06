import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import {
  collectionMarketStats,
  collections,
} from "@/lib/server/db/indexer/schema";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import { marketSorting, orderBy } from "@/lib/server/objekts/market.server";
import { watchlistBackendSchema } from "@/lib/universal/parsers";
import {
  DEFAULT_WATCHLIST_SORT,
  type WatchlistItem,
  type WatchlistResponse,
} from "@/lib/universal/watchlist";
import { collectionWatches } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, getColumns, inArray, isNull } from "drizzle-orm";
import * as z from "zod";

const LIMIT = 60;

const watchSchema = z.object({
  // collection slug, stored in collection_watches.collection_id (varchar(36))
  slug: z.string().min(1).max(36),
});

/**
 * Slugs of the collections the viewer watches, newest first.
 */
export const $fetchWatchedSlugs = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const rows = await db
      .select({ slug: collectionWatches.collectionId })
      .from(collectionWatches)
      .where(eq(collectionWatches.userId, context.session.session.userId))
      .orderBy(desc(collectionWatches.createdAt));
    return rows.map((row) => row.slug);
  });

/**
 * Watch a collection, so anyone listing it notifies the viewer.
 */
export const $watchCollection = createServerFn({ method: "POST" })
  .validator(watchSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .insert(collectionWatches)
      .values({
        userId: context.session.session.userId,
        collectionId: data.slug,
      })
      .onConflictDoNothing();
    return true;
  });

export const $unwatchCollection = createServerFn({ method: "POST" })
  .validator(watchSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .delete(collectionWatches)
      .where(
        and(
          eq(collectionWatches.userId, context.session.session.userId),
          eq(collectionWatches.collectionId, data.slug),
        ),
      );
    return true;
  });

/**
 * The viewer's watched collections with their market stats, including ones
 * nobody is selling, which sort last. Watches live in the web DB and stats in
 * the indexer, so the slugs are read first and filter the indexer query.
 */
export const $fetchWatchlist = createServerFn({ method: "GET" })
  .validator(watchlistBackendSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<WatchlistResponse> => {
    const watches = await db
      .select({ slug: collectionWatches.collectionId })
      .from(collectionWatches)
      .where(eq(collectionWatches.userId, context.session.session.userId));
    if (watches.length === 0) {
      return { objekts: [], nextStartAfter: undefined, total: 0 };
    }

    const where = and(
      inArray(
        collections.slug,
        watches.map((w) => w.slug),
      ),
      ...withArtist(data.artist),
      ...withMember(data.member),
      ...withSeason(data.season ?? []),
      ...withClass(data.class ?? []),
      ...withOnlineType(data.on_offline ?? []),
      ...withCollections(data.collectionNo),
    );

    // one row past the page says whether there's more
    const [rows, total] = await Promise.all([
      indexer
        .select({
          ...getColumns(collections),
          floorUsd: collectionMarketStats.floorUsd,
          listingCount: collectionMarketStats.listingCount,
        })
        .from(collections)
        .leftJoin(
          collectionMarketStats,
          eq(collectionMarketStats.slug, collections.slug),
        )
        .where(where)
        .orderBy(
          // unlisted collections have no stats row
          asc(isNull(collectionMarketStats.slug)),
          ...orderBy(marketSorting[data.sort ?? DEFAULT_WATCHLIST_SORT], {
            ...getColumns(collectionMarketStats),
            slug: collections.slug,
          }),
        )
        .limit(LIMIT + 1)
        .offset(data.page * LIMIT),
      // the header only reads the first page's total
      data.page === 0 ? indexer.$count(collections, where) : null,
    ]);

    return {
      objekts: rows.slice(0, LIMIT).map(({ listingCount, ...item }) => ({
        ...item,
        listingCount: listingCount ?? 0,
      })) satisfies WatchlistItem[],
      nextStartAfter: rows.length > LIMIT ? data.page + 1 : undefined,
      total,
    };
  });
