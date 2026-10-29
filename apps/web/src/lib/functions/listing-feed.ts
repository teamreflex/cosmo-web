import { toPublicUser } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { feedbackRepColumns } from "@/lib/server/feedback.server";
import {
  freePoolCount,
  hydrateListings,
  listingFeedWhere,
  postedCount,
  storedWants,
} from "@/lib/server/trades/feed.server";
import { toFeedbackRep } from "@/lib/universal/feedback";
import {
  listingFeedInputSchema,
  listingFeedTotalInputSchema,
} from "@/lib/universal/schema/listing-feed";
import type { ListingFeedPage } from "@/lib/universal/trade-listings";
import { tradeOffers } from "@apollo/database/web/schema";
import { listingUnitSize } from "@apollo/trades/lifecycle";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, inArray, sql } from "drizzle-orm";

const PAGE_SIZE = 30;

/**
 * One page of the Listings feed: open listings, most recently posted or
 * bumped first, keyset-paged on `(bumped_at, id)`, each with its unit size
 * and how many of its pool objekts are free, counted for the page's rows
 * only. The cursor is the previous page's last place as that page read it,
 * so a listing bumped, claimed from, edited or withdrawn between pages
 * still marks the place; a bumped one moves to the top of a refetch rather
 * than repeating. The page reads one row past its size to say whether
 * there's more.
 */
export const $fetchListingFeed = createServerFn({ method: "GET" })
  .validator(listingFeedInputSchema)
  .handler(async ({ data }): Promise<ListingFeedPage> => {
    const where = listingFeedWhere(data);
    const pageIds = db
      .select({ id: tradeOffers.id })
      .from(tradeOffers)
      .where(
        data.cursor === undefined
          ? where
          : and(
              where,
              sql`(${tradeOffers.bumpedAt}, ${tradeOffers.id}) < (${sql.param(
                data.cursor.bumpedAt,
                tradeOffers.bumpedAt,
              )}, ${data.cursor.id})`,
            ),
      )
      .orderBy(desc(tradeOffers.bumpedAt), desc(tradeOffers.id))
      .limit(PAGE_SIZE + 1);
    const rows = await db.query.tradeOffers.findMany({
      where: { RAW: (t) => inArray(t.id, pageIds) },
      columns: {
        id: true,
        createdAt: true,
        bumpedAt: true,
        fromUserId: true,
        fromAddress: true,
        unitSize: true,
      },
      extras: {
        free: (t) => freePoolCount(t),
        posted: (t) => postedCount(t.id),
      },
      with: {
        items: { where: { leftAt: { isNull: true } }, orderBy: { id: "asc" } },
        wants: storedWants,
        fromUser: true,
        fromCosmo: { columns: { username: true } },
        fromStats: { columns: feedbackRepColumns },
      },
      orderBy: { bumpedAt: "desc", id: "desc" },
    });
    const page = rows.slice(0, PAGE_SIZE);
    const last = rows.length > PAGE_SIZE ? page.at(-1) : undefined;

    const { listings } = await hydrateListings(page);

    return {
      rows: listings.map((listing) => ({
        id: listing.id,
        createdAt: listing.createdAt,
        poster: listing.fromUser && toPublicUser(listing.fromUser),
        cosmoUsername: listing.fromCosmo?.username ?? null,
        rep: listing.fromUser && toFeedbackRep(listing.fromStats),
        items: listing.items,
        wants: listing.wants,
        unitSize: listingUnitSize(listing),
        posted: listing.posted,
        free: listing.free,
      })),
      nextCursor: last && { bumpedAt: last.bumpedAt, id: last.id },
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
