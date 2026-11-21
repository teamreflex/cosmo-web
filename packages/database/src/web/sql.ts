import { and, type AnyColumn, eq, exists, inArray, sql } from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { tradeOfferItems, tradeOffers } from "./schema";
import { liveTradeStatuses, type TradeStatus } from "./types";

/**
 * What every listing write sets `updated_at` to: the database clock, but
 * always at least a millisecond past the old value, so it strictly increases
 * however the app servers' clocks drift. Accept compares it to the value the
 * claimer saw.
 */
export const bumpUpdatedAt = sql`greatest(clock_timestamp(), ${tradeOffers.updatedAt} + interval '1 millisecond')`;

const qb = new QueryBuilder();
const poolTrade = alias(tradeOffers, "pool_trade");

// a trade from the listing in `statuses`, found through any of its items, which keep the listing's id
function tradeFromListing(statuses: readonly TradeStatus[]) {
  return and(
    eq(tradeOfferItems.listingId, tradeOffers.id),
    inArray(poolTrade.status, [...statuses]),
  );
}

/**
 * The units of a buy listing's trades in `statuses`, as an int: only a
 * trade claimed from a buy listing records its units. A pool listing
 * (`max_units` null) reads 0 without running the sum. `listing` is the
 * listing's columns, aliased or not.
 */
function listingUnitsIn(
  listing: { id: AnyColumn; maxUnits: AnyColumn },
  statuses: readonly TradeStatus[],
) {
  return sql<number>`(case when ${listing.maxUnits} is null then 0 else (${qb
    .select({ units: sql`coalesce(sum(${poolTrade.units}), 0)` })
    .from(poolTrade)
    .where(
      and(
        inArray(poolTrade.status, [...statuses]),
        exists(
          qb
            .select({ id: tradeOfferItems.id })
            .from(tradeOfferItems)
            .where(
              and(
                eq(tradeOfferItems.offerId, poolTrade.id),
                eq(tradeOfferItems.listingId, listing.id),
              ),
            ),
        ),
      ),
    )}) end)::int`.mapWith(Number);
}

/**
 * The units a buy listing's live and completed trades hold, which its most
 * units bound; a pending offer holds none, and a pool listing reads 0
 * (listingUnitsIn).
 */
export function listingTakenUnits(listing: {
  id: AnyColumn;
  maxUnits: AnyColumn;
}) {
  return listingUnitsIn(listing, [...liveTradeStatuses, "completed"]);
}

/**
 * What closing a listing judges (listingClosing in @apollo/trades), as
 * columns of a select from `trade_offers`: how many objekts are still in
 * its pool, whether one of its trades is live, whether one completed, and
 * the units its completed trades filled. Every trade from a listing keeps
 * the listing's id on an item: the poster's objekts, or the poster's
 * payment on a buy listing, whose items are never live, so a trade's
 * status says whether it is live.
 */
export const listingPoolState = {
  pool: sql<number>`(select count(*) from ${tradeOfferItems} where ${tradeOfferItems.offerId} = ${tradeOffers.id} and ${tradeOfferItems.leftAt} is null)::int`.mapWith(
    Number,
  ),
  live: exists(
    qb
      .select({ id: tradeOfferItems.id })
      .from(tradeOfferItems)
      .innerJoin(poolTrade, eq(poolTrade.id, tradeOfferItems.offerId))
      .where(tradeFromListing(liveTradeStatuses)),
  ).mapWith(Boolean),
  completed: exists(
    qb
      .select({ id: tradeOfferItems.id })
      .from(tradeOfferItems)
      .innerJoin(poolTrade, eq(poolTrade.id, tradeOfferItems.offerId))
      .where(tradeFromListing(["completed"])),
  ).mapWith(Boolean),
  completedUnits: listingUnitsIn(tradeOffers, ["completed"]),
};
