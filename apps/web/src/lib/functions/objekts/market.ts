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
import type {
  MarketItem,
  MarketResponse,
  MarketSort,
} from "@/lib/universal/market";
import { marketBackendSchema } from "@/lib/universal/parsers";
import { createServerFn } from "@tanstack/react-start";
import { and, getColumns } from "drizzle-orm";

const LIMIT = 60;

/**
 * Collections with at least one sale listing, filtered like the objekt index
 * and sorted by the market aggregate (floor, count, recency). The aggregate
 * is small enough to sort and page in memory.
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
            .select(getColumns(collections))
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

    const items = rows.flatMap((collection): MarketItem[] => {
      const stat = stats.get(collection.slug);
      return stat === undefined
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
    items.sort(comparator(data.sort ?? "floorAsc"));

    const start = data.page * LIMIT;
    const page = items.slice(start, start + LIMIT);
    const hasNext = start + LIMIT < items.length;

    return {
      total: items.length,
      listingTotal: items.reduce((sum, i) => sum + i.listingCount, 0),
      hasNext,
      nextStartAfter: hasNext ? data.page + 1 : undefined,
      objekts: page,
    };
  });

function comparator(sort: MarketSort) {
  switch (sort) {
    case "floorDesc":
      return (a: MarketItem, b: MarketItem) =>
        b.floorUsd - a.floorUsd || b.listingCount - a.listingCount;
    case "mostListed":
      return (a: MarketItem, b: MarketItem) =>
        b.listingCount - a.listingCount || a.floorUsd - b.floorUsd;
    case "recentlyListed":
      return (a: MarketItem, b: MarketItem) => b.lastListed - a.lastListed;
    case "floorAsc":
      return (a: MarketItem, b: MarketItem) =>
        a.floorUsd - b.floorUsd || b.listingCount - a.listingCount;
  }
}
