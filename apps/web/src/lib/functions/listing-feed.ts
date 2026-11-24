import { toPublicUser } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { feedbackRepColumns } from "@/lib/server/feedback.server";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import {
  hydrateListings,
  listingFeedWhere,
  openListing,
  postedCount,
  storedWants,
} from "@/lib/server/trades/feed.server";
import { toFeedbackRep } from "@/lib/universal/feedback";
import {
  type ListingFeedCursor,
  listingFeedInputSchema,
  listingFeedTotalInputSchema,
  myListingsInputSchema,
} from "@/lib/universal/schema/listing-feed";
import {
  type ListingFeedPage,
  listingSize,
  type MyListingsPage,
} from "@/lib/universal/trade-listings";
import { tradeOffers } from "@apollo/database/web/schema";
import { listingTakenUnits, listingTradeCount } from "@apollo/database/web/sql";
import { liveTradeStatuses } from "@apollo/database/web/types";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, type SQL, sql } from "drizzle-orm";

const PAGE_SIZE = 30;

/**
 * The ids of one page of the listings `where` matches, most recently posted
 * or bumped first, keyset-paged on `(bumped_at, id)` after the cursor. It
 * reads one row past the page's size to say whether there's more.
 */
function pageIds(
  where: SQL | undefined,
  cursor: ListingFeedCursor | undefined,
) {
  return db
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(
      cursor === undefined
        ? where
        : and(
            where,
            sql`(${tradeOffers.bumpedAt}, ${tradeOffers.id}) < (${sql.param(
              cursor.bumpedAt,
              tradeOffers.bumpedAt,
            )}, ${cursor.id})`,
          ),
    )
    .orderBy(desc(tradeOffers.bumpedAt), desc(tradeOffers.id))
    .limit(PAGE_SIZE + 1);
}

// the columns and relations every listing slip reads
const slipColumns = {
  columns: {
    id: true,
    createdAt: true,
    bumpedAt: true,
    unitSize: true,
    maxUnits: true,
    paymentSide: true,
    paymentMethods: true,
    offers: true,
  },
  with: {
    items: { where: { leftAt: { isNull: true } }, orderBy: { id: "asc" } },
    wants: storedWants,
  },
} as const;

/**
 * Cuts the extra row off a page read through pageIds(), and the cursor
 * after its last row when that row was there.
 */
function toPage<T extends { id: string; bumpedAt: Date }>(rows: T[]) {
  const page = rows.slice(0, PAGE_SIZE);
  const last = rows.length > PAGE_SIZE ? page.at(-1) : undefined;
  return { page, nextCursor: last && { bumpedAt: last.bumpedAt, id: last.id } };
}

/**
 * One page of the Listings feed: open listings, most recently posted or
 * bumped first, each with its units, or a buy listing's units and how
 * many its trades hold. The cursor is the
 * previous page's last place as that page read it, so a listing bumped,
 * claimed from, edited or withdrawn between pages still marks the place; a
 * bumped one moves to the top of a refetch rather than repeating.
 */
export const $fetchListingFeed = createServerFn({ method: "GET" })
  .validator(listingFeedInputSchema)
  .handler(async ({ data }): Promise<ListingFeedPage> => {
    const rows = await db.query.tradeOffers.findMany({
      where: {
        RAW: (t) => inArray(t.id, pageIds(listingFeedWhere(data), data.cursor)),
      },
      columns: {
        ...slipColumns.columns,
        fromUserId: true,
        fromAddress: true,
      },
      extras: {
        posted: (t) => postedCount(t.id),
        taken: (t) => listingTakenUnits(t),
      },
      with: {
        ...slipColumns.with,
        fromUser: true,
        fromCosmo: { columns: { username: true } },
        fromStats: { columns: feedbackRepColumns },
      },
      orderBy: { bumpedAt: "desc", id: "desc" },
    });
    const { page, nextCursor } = toPage(rows);
    const { listings } = await hydrateListings(page);

    return {
      rows: listings.map((listing) => ({
        id: listing.id,
        createdAt: listing.createdAt,
        poster: listing.fromUser && toPublicUser(listing.fromUser),
        cosmoUsername: listing.fromCosmo?.username ?? null,
        rep: listing.fromUser && toFeedbackRep(listing.fromStats),
        items: listing.items,
        options: listing.options,
        units: listingSize(listing),
        posted: listing.posted,
      })),
      nextCursor,
    };
  });

/**
 * How many open listings the feed's filters match, for the header.
 */
export const $fetchListingFeedTotal = createServerFn({ method: "GET" })
  .validator(listingFeedTotalInputSchema)
  .handler(async ({ data }) => {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int`.mapWith(Number) })
      .from(tradeOffers)
      .where(listingFeedWhere(data));
    return row?.total ?? 0;
  });

/**
 * The caller's open listings for My trades, paged as the feed is, each
 * with the pending offers waiting on them and the trades from it under
 * way. A poster's open listings go through `trade_offers_from_user_idx`.
 */
export const $fetchMyListings = createServerFn({ method: "GET" })
  .validator(myListingsInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<MyListingsPage> => {
    const where = and(
      eq(tradeOffers.fromUserId, context.session.user.id),
      openListing,
    );
    const rows = await db.query.tradeOffers.findMany({
      where: { RAW: (t) => inArray(t.id, pageIds(where, data.cursor)) },
      columns: slipColumns.columns,
      extras: {
        posted: (t) => postedCount(t.id),
        taken: (t) => listingTakenUnits(t),
        pendingOffers: (t) => listingTradeCount(t, ["pending"]),
        liveTrades: (t) => listingTradeCount(t, liveTradeStatuses),
      },
      with: slipColumns.with,
      orderBy: { bumpedAt: "desc", id: "desc" },
    });
    const { page, nextCursor } = toPage(rows);
    const { listings } = await hydrateListings(page);

    return {
      rows: listings.map((listing) => ({
        id: listing.id,
        createdAt: listing.createdAt,
        items: listing.items,
        options: listing.options,
        units: listingSize(listing),
        posted: listing.posted,
        offers: listing.pendingOffers,
        liveTrades: listing.liveTrades,
      })),
      nextCursor,
    };
  });
