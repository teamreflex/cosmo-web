import { remember } from "@/lib/server/cache.server";
import { indexer } from "@/lib/server/db/indexer";
import {
  collectionMarketStats,
  collections,
} from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
} from "@/lib/server/objekts/filters.server";
import {
  marketSorting,
  orderBy,
  type Sorting,
} from "@/lib/server/objekts/market.server";
import {
  DEFAULT_MARKET_SORT,
  type FloorBounds,
  type MarketCursor,
  type MarketListedWindow,
  marketListedWindowMs,
  type MarketResponse,
} from "@/lib/universal/market";
import { marketBackendSchema } from "@/lib/universal/parsers";
import { createServerFn } from "@tanstack/react-start";
import {
  and,
  eq,
  getColumns,
  gt,
  gte,
  lt,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

const LIMIT = 60;

/**
 * Collections with at least one priced sale listing, filtered like the objekt
 * index plus the listing window and floor range, and sorted by their market stats.
 */
export const $fetchMarket = createServerFn({ method: "GET" })
  .validator(marketBackendSchema)
  .handler(async ({ data }): Promise<MarketResponse> => {
    const sort = marketSorting[data.sort ?? DEFAULT_MARKET_SORT];
    const where = and(
      ...withArtist(data.artist),
      ...withClass(data.class ?? []),
      ...withSeason(data.season ?? []),
      ...withOnlineType(data.on_offline ?? []),
      ...withMember(data.member),
      ...withCollections(data.collectionNo),
      ...withSelectedArtists(data.artists),
      ...withListedWithin(data.listed),
      ...withFloorBounds(data),
    );

    // pick the page on the narrow stats columns and join back only its rows
    // for the full collection. one row past the page says whether there's more
    const page = indexer.$with("page").as(
      indexer
        .select(getColumns(collectionMarketStats))
        .from(collectionMarketStats)
        .innerJoin(
          collections,
          eq(collections.slug, collectionMarketStats.slug),
        )
        .where(
          data.cursor === undefined
            ? where
            : and(where, after(sort, data.cursor)),
        )
        .orderBy(...orderBy(sort, collectionMarketStats))
        .limit(LIMIT + 1),
    );

    const [rows, totals] = await Promise.all([
      indexer
        .with(page)
        .select({
          ...getColumns(collections),
          floorUsd: page.floorUsd,
          listingCount: page.listingCount,
          lastListedAt: page.lastListedAt,
        })
        .from(page)
        .innerJoin(collections, eq(collections.slug, page.slug))
        .orderBy(...orderBy(sort, page)),
      // the header only reads the first page's totals
      data.cursor === undefined ? fetchTotals(where) : null,
    ]);

    const items = rows.slice(0, LIMIT);
    const last = items.at(-1);

    return {
      objekts: items.map(({ lastListedAt: _, ...item }) => item),
      nextCursor:
        rows.length > LIMIT && last !== undefined
          ? {
              slug: last.slug,
              floorUsd: last.floorUsd,
              listingCount: last.listingCount,
              lastListedAt: last.lastListedAt.toISOString(),
            }
          : undefined,
      totals,
    };
  });

/**
 * The sum of listings across matching collections. The unfiltered totals
 * are cached for as long as the stats sync takes to change them; filtered
 * totals are too varied to cache.
 */
function fetchTotals(where: SQL | undefined) {
  const query = async () => {
    const [totals] = await indexer
      .select({
        listings:
          sql<number>`coalesce(sum(${collectionMarketStats.listingCount}), 0)::int`.mapWith(
            Number,
          ),
      })
      .from(collectionMarketStats)
      .innerJoin(collections, eq(collections.slug, collectionMarketStats.slug))
      .where(where);
    return totals ?? { listings: 0 };
  };

  return where === undefined ? remember("market-total", 60, query) : query();
}

/**
 * Rows after the cursor in the sort's order: past it on some key while tied
 * on every key before that one. The leading bound is redundant but lets the
 * sort's index start at the cursor. The floor compares as `real`, how it's
 * stored and read into the cursor.
 */
function after(sorting: Sorting, cursor: MarketCursor) {
  const values = {
    slug: sql`${cursor.slug}`,
    floorUsd: sql`${cursor.floorUsd}::real`,
    listingCount: sql`${cursor.listingCount}::int`,
    lastListedAt: sql`${cursor.lastListedAt}::timestamptz`,
  } satisfies Record<keyof MarketCursor, SQL>;
  const columns = collectionMarketStats;
  const [lead] = sorting;
  if (lead === undefined) return undefined;

  return and(
    lead.dir === "asc"
      ? gte(columns[lead.key], values[lead.key])
      : lte(columns[lead.key], values[lead.key]),
    or(
      ...sorting.map(({ key, dir }, i) =>
        and(
          ...sorting
            .slice(0, i)
            .map((tied) => eq(columns[tied.key], values[tied.key])),
          dir === "asc"
            ? gt(columns[key], values[key])
            : lt(columns[key], values[key]),
        ),
      ),
    ),
  );
}

/**
 * Filter by the collection's most recent listing.
 */
function withListedWithin(listed: MarketListedWindow | null | undefined) {
  return listed == null
    ? []
    : [
        gte(
          collectionMarketStats.lastListedAt,
          new Date(Date.now() - marketListedWindowMs[listed]),
        ),
      ];
}

/**
 * Filter by floor: the minimum is inclusive and the maximum exclusive, since
 * both are already widened to cover floors that display as the bound.
 */
function withFloorBounds({ minFloorUsd, maxFloorUsd }: FloorBounds) {
  return [
    ...(minFloorUsd === undefined
      ? []
      : [gte(collectionMarketStats.floorUsd, minFloorUsd)]),
    ...(maxFloorUsd === undefined
      ? []
      : [lt(collectionMarketStats.floorUsd, maxFloorUsd)]),
  ];
}
