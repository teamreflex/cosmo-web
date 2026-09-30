import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
  withSelectedArtists,
} from "@/lib/server/objekts/filters.server";
import { fetchMarketStats } from "@/lib/server/objekts/market.server";
import {
  inFloorBounds,
  type MarketItem,
  marketListedWindowMs,
  type MarketResponse,
  type MarketSort,
} from "@/lib/universal/market";
import { marketBackendSchema } from "@/lib/universal/parsers";
import { createServerFn } from "@tanstack/react-start";
import { and } from "drizzle-orm";

const LIMIT = 60;

/**
 * Collections with at least one sale listing, filtered like the objekt index
 * plus the listing window and floor range, and sorted by the market aggregate
 * (floor, count, recency). The aggregate is small enough to sort and page in
 * memory.
 */
export const $fetchMarket = createServerFn({ method: "GET" })
  .validator(marketBackendSchema)
  .handler(async ({ data }): Promise<MarketResponse> => {
    const stats = await fetchMarketStats();
    const slugs = [...stats.keys()];

    const rows =
      slugs.length === 0
        ? []
        : await indexer
            .select()
            .from(collections)
            .where(
              and(
                ...withObjektListEntries(slugs),
                ...withArtist(data.artist),
                ...withClass(data.class ?? []),
                ...withSeason(data.season ?? []),
                ...withOnlineType(data.on_offline ?? []),
                ...withMember(data.member),
                ...withCollections(data.collectionNo),
                ...withSelectedArtists(data.artists),
              ),
            );

    const listedAfter =
      data.listed == null ? 0 : Date.now() - marketListedWindowMs[data.listed];
    const matching = rows.flatMap((collection): MarketItem[] => {
      const stat = stats.get(collection.slug);
      return stat === undefined || stat.lastListed < listedAfter
        ? []
        : [
            {
              ...collection,
              floorUsd: stat.floorUsd,
              listingCount: stat.listingCount,
              lastListed: stat.lastListed,
            },
          ];
    });
    const items = matching
      .filter((item) => inFloorBounds(item.floorUsd, data))
      .sort(comparator(data.sort ?? "floorAsc"));

    const start = data.page * LIMIT;
    const page = items.slice(start, start + LIMIT);
    const hasNext = start + LIMIT < items.length;

    return {
      total: items.length,
      listingTotal: items.reduce((sum, i) => sum + i.listingCount, 0),
      hasNext,
      nextStartAfter: hasNext ? data.page + 1 : undefined,
      objekts: page,
      floors: data.page === 0 ? matching.map((i) => i.floorUsd) : undefined,
    };
  });

/**
 * Every sort ends on the slug, so ties keep one order across page requests.
 */
function comparator(sort: MarketSort) {
  const primary = sortKeys[sort];
  return (a: MarketItem, b: MarketItem) =>
    primary(a, b) || a.slug.localeCompare(b.slug);
}

const sortKeys = {
  floorAsc: (a, b) =>
    a.floorUsd - b.floorUsd || b.listingCount - a.listingCount,
  floorDesc: (a, b) =>
    b.floorUsd - a.floorUsd || b.listingCount - a.listingCount,
  mostListed: (a, b) =>
    b.listingCount - a.listingCount || a.floorUsd - b.floorUsd,
  recentlyListed: (a, b) => b.lastListed - a.lastListed,
} satisfies Record<MarketSort, (a: MarketItem, b: MarketItem) => number>;
