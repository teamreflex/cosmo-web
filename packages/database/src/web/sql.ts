import { and, eq, exists, sql } from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { tradeOfferItems, tradeOffers } from "./schema";

/**
 * What every listing write sets `updated_at` to: the database clock, but
 * always at least a millisecond past the old value, so it strictly increases
 * however the app servers' clocks drift. Accept compares it to the value the
 * claimer saw.
 */
export const bumpUpdatedAt = sql`greatest(clock_timestamp(), ${tradeOffers.updatedAt} + interval '1 millisecond')`;

const qb = new QueryBuilder();
const poolTrade = alias(tradeOffers, "pool_trade");

/**
 * What closing a listing judges (listingClosing in @apollo/trades), as
 * columns of a select from `trade_offers`: how many objekts are still in
 * its pool,
 * whether one of its trades is live, and whether one completed. A trade's
 * poster items keep the listing's id, and only a live trade's are live.
 */
export const listingPoolState = {
  pool: sql<number>`(select count(*) from ${tradeOfferItems} where ${tradeOfferItems.offerId} = ${tradeOffers.id} and ${tradeOfferItems.leftAt} is null)::int`.mapWith(
    Number,
  ),
  live: exists(
    qb
      .select({ id: tradeOfferItems.id })
      .from(tradeOfferItems)
      .where(
        and(
          eq(tradeOfferItems.listingId, tradeOffers.id),
          eq(tradeOfferItems.live, true),
        ),
      ),
  ).mapWith(Boolean),
  completed: exists(
    qb
      .select({ id: tradeOfferItems.id })
      .from(tradeOfferItems)
      .innerJoin(poolTrade, eq(poolTrade.id, tradeOfferItems.offerId))
      .where(
        and(
          eq(tradeOfferItems.listingId, tradeOffers.id),
          eq(poolTrade.status, "completed"),
        ),
      ),
  ).mapWith(Boolean),
};
