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
import type { MarketSort } from "@/lib/universal/market";
import { watchlistBackendSchema } from "@/lib/universal/parsers";
import {
  DEFAULT_WATCHLIST_SORT,
  type WatchlistItem,
  type WatchlistResponse,
} from "@/lib/universal/watchlist";
import { collectionWatches } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, getColumns, inArray } from "drizzle-orm";
import * as z from "zod";

const LIMIT = 60;

const watchSchema = z.object({
  slug: z.string().max(36),
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
 * nobody is selling. Watches live in the web DB and stats in the indexer, so
 * the slugs are read first; a watchlist is small enough to filter, sort and
 * page in memory, as my listings does.
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

    const rows = await indexer
      .select({
        ...getColumns(collections),
        floorUsd: collectionMarketStats.floorUsd,
        listingCount: collectionMarketStats.listingCount,
        lastListedAt: collectionMarketStats.lastListedAt,
      })
      .from(collections)
      .leftJoin(
        collectionMarketStats,
        eq(collectionMarketStats.slug, collections.slug),
      )
      .where(
        and(
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
        ),
      );

    sortWatchlist(rows, data.sort ?? DEFAULT_WATCHLIST_SORT);
    const start = data.page * LIMIT;

    return {
      objekts: rows
        .slice(start, start + LIMIT)
        .map(({ lastListedAt: _, listingCount, ...item }) => ({
          ...item,
          listingCount: listingCount ?? 0,
        })) satisfies WatchlistItem[],
      nextStartAfter: start + LIMIT < rows.length ? data.page + 1 : undefined,
      total: data.page === 0 ? rows.length : null,
    };
  });

type Row = {
  slug: string;
  floorUsd: number | null;
  listingCount: number | null;
  lastListedAt: Date | null;
};

/**
 * Sort in place by the market's sorts. Collections with no listings sort
 * last in every sort, then by slug so paging is stable.
 */
function sortWatchlist(rows: Row[], sort: MarketSort) {
  const listedFirst = (a: Row, b: Row) =>
    (a.floorUsd === null ? 1 : 0) - (b.floorUsd === null ? 1 : 0);
  const bySlug = (a: Row, b: Row) => a.slug.localeCompare(b.slug);
  const floor = (row: Row) => row.floorUsd ?? 0;
  const count = (row: Row) => row.listingCount ?? 0;
  const listedAt = (row: Row) => row.lastListedAt?.getTime() ?? 0;

  const compare = {
    floorAsc: (a: Row, b: Row) => floor(a) - floor(b) || count(b) - count(a),
    floorDesc: (a: Row, b: Row) => floor(b) - floor(a) || count(b) - count(a),
    mostListed: (a: Row, b: Row) => count(b) - count(a) || floor(a) - floor(b),
    recentlyListed: (a: Row, b: Row) => listedAt(b) - listedAt(a),
  }[sort];

  rows.sort((a, b) => listedFirst(a, b) || compare(a, b) || bySlug(a, b));
}
