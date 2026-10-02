import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import {
  withArtist,
  withClass,
  withObjektListEntries,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import {
  fetchMarketStats,
  isFloorPrice,
} from "@/lib/server/objekts/market.server";
import { fetchSerials } from "@/lib/server/objekts/serials.server";
import type {
  MarketStats,
  MyListingSort,
  MyListingStatus,
  MyListingStatusKind,
  MyListingsResponse,
  MyListingsSummary,
} from "@/lib/universal/market";
import { myListingsBackendSchema } from "@/lib/universal/parsers";
import { createServerFn } from "@tanstack/react-start";
import { and } from "drizzle-orm";

const LIMIT = 60;

/**
 * Every serial across the viewer's sale lists with where it stands against
 * the market: at the floor, undercut by another seller, the only seller, off
 * the market or unpriced. The market stats are computed live, so a repriced
 * serial shows its new standing on the next fetch. Sale lists are one
 * seller's entries (about 2,000 at most on prod), so they're filtered, sorted
 * and paged in memory, as an objekt list is.
 */
export const $fetchMyListings = createServerFn({ method: "GET" })
  .validator(myListingsBackendSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<MyListingsResponse> => {
    const lists = await db.query.objektLists.findMany({
      where: { userId: context.session.session.userId, type: "sale" },
      columns: { id: true, currency: true },
      with: {
        entries: {
          columns: {
            id: true,
            collectionId: true,
            tokenId: true,
            quantity: true,
            price: true,
            createdAt: true,
          },
        },
        // latest rate for the list's currency
        fxRates: {
          columns: { rateToUsd: true },
          orderBy: { date: "desc" },
          limit: 1,
        },
      },
    });

    const entries = lists.flatMap(({ currency, entries, fxRates, id }) => {
      // sale lists always have a currency
      if (currency === null) return [];
      const rateToUsd = fxRates[0]?.rateToUsd ?? null;
      return entries.map((entry) => ({
        ...entry,
        listId: id,
        currency,
        rateToUsd,
        priceUsd:
          entry.price === null || rateToUsd === null
            ? null
            : entry.price * rateToUsd,
      }));
    });

    // the market counts priced serials whose currency has a rate
    const ownListingCounts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.tokenId === null || entry.priceUsd === null) continue;
      ownListingCounts.set(
        entry.collectionId,
        (ownListingCounts.get(entry.collectionId) ?? 0) + 1,
      );
    }
    const marketStats = await fetchMarketStats([...ownListingCounts.keys()]);

    const withStatus = entries.map((entry) => ({
      ...entry,
      status: listingStatus(
        entry,
        marketStats.get(entry.collectionId),
        ownListingCounts.get(entry.collectionId) ?? 0,
      ),
    }));

    const collectionFilters = [
      ...withArtist(data.artist),
      ...withSeason(data.season ?? []),
      ...withClass(data.class ?? []),
    ];
    const matchingSlugs =
      collectionFilters.length === 0 || withStatus.length === 0
        ? undefined
        : new Set(
            (
              await indexer
                .select({ slug: collections.slug })
                .from(collections)
                .where(
                  and(
                    ...withObjektListEntries([
                      ...new Set(withStatus.map((e) => e.collectionId)),
                    ]),
                    ...collectionFilters,
                  ),
                )
            ).map((row) => row.slug),
          );

    const filtered = withStatus.filter(
      (entry) =>
        (data.status == null || entry.status.kind === data.status) &&
        (data.list == null || entry.listId === data.list) &&
        (matchingSlugs === undefined || matchingSlugs.has(entry.collectionId)),
    );
    sortListings(filtered, data.sort ?? "gap");

    const start = data.page * LIMIT;
    const page = filtered.slice(start, start + LIMIT);
    const tokenIds = page.flatMap((e) =>
      e.tokenId === null ? [] : [e.tokenId],
    );
    const [pageCollections, serials] = await Promise.all([
      page.length === 0
        ? []
        : indexer
            .select()
            .from(collections)
            .where(
              and(
                ...withObjektListEntries([
                  ...new Set(page.map((e) => e.collectionId)),
                ]),
              ),
            ),
      fetchSerials(tokenIds),
    ]);
    const collectionsBySlug = new Map(pageCollections.map((c) => [c.slug, c]));

    return {
      objekts: page.flatMap((entry) => {
        const collection = collectionsBySlug.get(entry.collectionId);
        if (collection === undefined) return [];
        return [
          {
            ...collection,
            id: entry.id,
            entrySerial:
              entry.tokenId === null
                ? null
                : (serials.get(entry.tokenId) ?? null),
            entryTokenId: entry.tokenId,
            entryQuantity: entry.quantity,
            entryPrice: entry.price,
            entryPriceUsd: entry.priceUsd,
            listId: entry.listId,
            listCurrency: entry.currency,
            listRateToUsd: entry.rateToUsd,
            status: entry.status,
          },
        ];
      }),
      nextStartAfter:
        start + LIMIT < filtered.length ? data.page + 1 : undefined,
      summary: data.page === 0 ? summarize(withStatus, lists.length) : null,
    };
  });

type Listing = {
  id: string;
  tokenId: string | null;
  quantity: number;
  price: number | null;
  priceUsd: number | null;
  createdAt: Date;
  status: MyListingStatus;
};

/**
 * A serial is the only seller's when every market listing of its collection
 * is the viewer's own; otherwise it's at the floor or undercut by the floor.
 */
function listingStatus(
  entry: Omit<Listing, "status">,
  stats: MarketStats | undefined,
  ownListingCount: number,
): MyListingStatus {
  if (entry.price === null) return { kind: "unpriced" };
  if (entry.tokenId === null || entry.priceUsd === null) {
    return { kind: "offMarket" };
  }
  if (stats === undefined || stats.listingCount <= ownListingCount) {
    return { kind: "onlySeller" };
  }
  if (isFloorPrice(entry.priceUsd, stats)) return { kind: "floor" };
  return { kind: "undercut", floorUsd: stats.floorUsd };
}

function summarize(listings: Listing[], lists: number): MyListingsSummary {
  const byStatus = (kind: MyListingStatusKind) =>
    listings.filter((listing) => listing.status.kind === kind).length;

  return {
    serials: listings.length,
    lists,
    priced: listings.filter((listing) => listing.price !== null).length,
    askingTotalUsd: listings.reduce(
      (sum, listing) => sum + (listing.priceUsd ?? 0) * listing.quantity,
      0,
    ),
    atFloor: byStatus("floor"),
    undercut: byStatus("undercut"),
    onlySeller: byStatus("onlySeller"),
  };
}

// the "gap to floor" sort: most overpriced first, then the ones that need no change
const statusOrder = {
  undercut: 0,
  floor: 1,
  onlySeller: 2,
  offMarket: 3,
  unpriced: 4,
} satisfies Record<MyListingStatusKind, number>;

/**
 * How far above the floor an undercut serial is, as a ratio.
 */
function floorGap(listing: Listing) {
  return listing.status.kind === "undercut" && listing.priceUsd !== null
    ? listing.priceUsd / listing.status.floorUsd
    : 0;
}

/**
 * Sort in place. Ties fall back to the newest-added entry, then the entry id,
 * so paging is stable. Serials without a USD price sort last by price.
 */
function sortListings(listings: Listing[], sort: MyListingSort) {
  const newest = (a: Listing, b: Listing) =>
    b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id);
  const byPrice = (dir: 1 | -1) => (a: Listing, b: Listing) => {
    if (a.priceUsd === null || b.priceUsd === null) {
      return (a.priceUsd === null ? 1 : 0) - (b.priceUsd === null ? 1 : 0);
    }
    return (a.priceUsd - b.priceUsd) * dir;
  };

  switch (sort) {
    case "gap":
      listings.sort(
        (a, b) =>
          statusOrder[a.status.kind] - statusOrder[b.status.kind] ||
          floorGap(b) - floorGap(a) ||
          newest(a, b),
      );
      return;
    case "priceAsc":
      listings.sort((a, b) => byPrice(1)(a, b) || newest(a, b));
      return;
    case "priceDesc":
      listings.sort((a, b) => byPrice(-1)(a, b) || newest(a, b));
      return;
    case "newest":
      listings.sort(newest);
  }
}
