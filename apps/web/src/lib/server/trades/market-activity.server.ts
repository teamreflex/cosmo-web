import { db } from "@/lib/server/db";
import {
  foldTradeItems,
  readIndexed,
  tradeSideSummary,
} from "@/lib/server/trades/feed.server";
import {
  toPartyName,
  tradeDispute,
} from "@/lib/server/trades/trade-view.server";
import {
  type MarketActivityOrigin,
  type MarketActivityPage,
  type MarketActivityState,
  marketActivityTradeStatuses,
  type MarketSummary,
} from "@/lib/universal/market-activity";
import type { MarketActivityInput } from "@/lib/universal/schema/trades";
import {
  cosmoAccounts,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import type {
  TradeEvent,
  TradeOffer,
  TradeOfferItem,
} from "@apollo/database/web/types";
import {
  tradeListingId,
  tradeParts,
  tradeState,
} from "@apollo/trades/lifecycle";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lt,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const PAGE_SIZE = 40;

const fromUser = alias(user, "from_user");
const toUser = alias(user, "to_user");
const fromCosmo = alias(cosmoAccounts, "from_cosmo");
const toCosmo = alias(cosmoAccounts, "to_cosmo");

/**
 * One page of every trade and offer by its latest change, newest first,
 * keyset-paged after the previous page's last trade. `updated_at` moves on
 * every write to a trade, so a trade that was offered, accepted or had an
 * objekt arrive comes back to the top.
 */
export async function fetchMarketActivity(
  input: MarketActivityInput,
): Promise<MarketActivityPage> {
  const statuses = marketActivityTradeStatuses(input);
  if (statuses.length === 0) {
    return { rows: [], nextCursor: undefined, total: 0 };
  }
  const filter = and(
    eq(tradeOffers.kind, "trade"),
    inArray(tradeOffers.status, statuses),
  );
  const cursor = input.cursor;

  const page = db.$with("page").as(
    db
      .select({
        id: tradeOffers.id,
        status: tradeOffers.status,
        fromUserId: tradeOffers.fromUserId,
        toUserId: tradeOffers.toUserId,
        fromAddress: tradeOffers.fromAddress,
        toAddress: tradeOffers.toAddress,
        parentId: tradeOffers.parentId,
        cancelledBy: tradeOffers.cancelledBy,
        proposedBy: tradeOffers.proposedBy,
        deadlineAt: tradeOffers.deadlineAt,
        expiresAt: tradeOffers.expiresAt,
        updatedAt: tradeOffers.updatedAt,
      })
      .from(tradeOffers)
      .where(
        and(
          filter,
          cursor === undefined
            ? undefined
            : or(
                lt(tradeOffers.updatedAt, new Date(cursor.at)),
                and(
                  eq(tradeOffers.updatedAt, new Date(cursor.at)),
                  lt(tradeOffers.id, cursor.id),
                ),
              ),
        ),
      )
      .orderBy(desc(tradeOffers.updatedAt), desc(tradeOffers.id))
      .limit(PAGE_SIZE + 1),
  );

  // the event that froze a disputed trade
  const halt = db
    .select({
      createdAt: tradeMessages.createdAt,
      event: tradeMessages.event,
    })
    .from(tradeMessages)
    .where(
      and(
        eq(tradeMessages.tradeId, page.id),
        eq(page.status, "disputed"),
        eq(tradeMessages.kind, "event"),
        sql`${tradeMessages.event}->>'type' = 'disputed'`,
      ),
    )
    .orderBy(desc(tradeMessages.id))
    .limit(1)
    .as("halt");

  // one row per item, in page order
  const [rows, total] = await Promise.all([
    db
      .with(page)
      .select({
        trade: {
          id: page.id,
          status: page.status,
          fromUserId: page.fromUserId,
          toUserId: page.toUserId,
          parentId: page.parentId,
          cancelledBy: page.cancelledBy,
          proposedBy: page.proposedBy,
          deadlineAt: page.deadlineAt,
          expiresAt: page.expiresAt,
          updatedAt: page.updatedAt,
        },
        item: tradeOfferItems,
        fromUser,
        toUser,
        fromCosmo: { username: fromCosmo.username },
        toCosmo: { username: toCosmo.username },
        halt: { createdAt: halt.createdAt, event: halt.event },
      })
      .from(page)
      .innerJoin(tradeOfferItems, eq(tradeOfferItems.offerId, page.id))
      .leftJoin(fromUser, eq(fromUser.id, page.fromUserId))
      .leftJoin(toUser, eq(toUser.id, page.toUserId))
      .leftJoin(fromCosmo, eq(fromCosmo.address, page.fromAddress))
      .leftJoin(toCosmo, eq(toCosmo.address, page.toAddress))
      .leftJoinLateral(halt, sql`true`)
      .orderBy(desc(page.updatedAt), desc(page.id), asc(tradeOfferItems.id)),
    cursor === undefined ? db.$count(tradeOffers, filter) : undefined,
  ]);

  const { trades, hasMore } = foldTradeItems(rows, PAGE_SIZE);
  const pageObjekts = trades.flatMap(({ objekts }) => objekts);
  const indexed = await readIndexed(
    [...new Set(pageObjekts.map(({ attributes }) => attributes.slug))],
    pageObjekts.map(({ tokenId }) => tokenId),
  );

  const last = trades.at(-1)?.row.trade;
  return {
    rows: trades.map(({ row, items, objekts, payment }) => {
      const { trade } = row;
      const parts = tradeParts(items);
      return {
        id: trade.id,
        updatedAt: trade.updatedAt,
        state: activityState(trade, items, row.halt),
        origin: activityOrigin(trade, items),
        from: toPartyName(trade.fromUserId, row.fromUser, row.fromCosmo),
        to: toPartyName(trade.toUserId, row.toUser, row.toCosmo),
        fromSide: tradeSideSummary("from", objekts, parts, payment, indexed),
        toSide: tradeSideSummary("to", objekts, parts, payment, indexed),
      };
    }),
    nextCursor:
      hasMore && last !== undefined
        ? { at: last.updatedAt.toISOString(), id: last.id }
        : undefined,
    total,
  };
}

type PageTrade = Pick<
  TradeOffer,
  | "status"
  | "cancelledBy"
  | "proposedBy"
  | "parentId"
  | "deadlineAt"
  | "expiresAt"
>;

/**
 * A pending offer is due when it expires, a live trade at its deadline;
 * tradeState() checks the row's shape for its status.
 */
function activityState(
  trade: PageTrade,
  items: TradeOfferItem[],
  halt: { createdAt: Date; event: TradeEvent | null } | null,
): MarketActivityState {
  const state = tradeState(trade, items);
  switch (state.status) {
    case "pending":
      if (trade.expiresAt === null) throw new Error("offer without an expiry");
      return {
        status: state.status,
        dueAt: trade.expiresAt,
        proposedBy: state.proposedBy,
      };
    case "accepted":
    case "disputed": {
      if (trade.deadlineAt === null) {
        throw new Error(`${state.status} trade without a deadline`);
      }
      return state.status === "accepted"
        ? { status: state.status, dueAt: trade.deadlineAt }
        : {
            status: state.status,
            dueAt: trade.deadlineAt,
            dispute: tradeDispute(state, halt === null ? [] : [halt]),
          };
    }
    default:
      return { status: state.status };
  }
}

/**
 * A claim starts accepted, so it has no proposer. An offer proposed by `to`
 * is always on a listing, and one proposed by `from` never is (tradeState()
 * refuses the other shapes while pending). A counter replies to its parent.
 */
function activityOrigin(
  trade: PageTrade,
  items: TradeOfferItem[],
): MarketActivityOrigin {
  const listingId = tradeListingId(items);
  if (listingId !== null) {
    return trade.proposedBy === null
      ? { kind: "claim", listingId }
      : { kind: "listing_offer", listingId };
  }
  return trade.parentId === null
    ? { kind: "direct_offer" }
    : { kind: "counter", parentId: trade.parentId };
}

/**
 * Each step counted in the last 24 hours by its own timestamp: offers by
 * when they were sent, claims by when they were made, accepted offers by
 * when they were accepted and endings by when they ended. Disputes are
 * counted as they stand now.
 */
export async function fetchMarketSummary(): Promise<MarketSummary> {
  const since = sql`now() - interval '24 hours'`;
  const counted = (condition: SQL) =>
    sql<number>`count(*) filter (where ${condition})`.mapWith(Number);
  const [row] = await db
    .select({
      offersSent: counted(
        sql`${tradeOffers.proposedBy} is not null and ${tradeOffers.createdAt} >= ${since}`,
      ),
      claims: counted(
        sql`${tradeOffers.proposedBy} is null and ${tradeOffers.createdAt} >= ${since}`,
      ),
      offersAccepted: counted(
        sql`${tradeOffers.proposedBy} is not null and ${tradeOffers.acceptedAt} >= ${since}`,
      ),
      completed: counted(
        sql`${tradeOffers.status} = 'completed' and ${tradeOffers.endedAt} >= ${since}`,
      ),
      endedEarly: counted(
        sql`${tradeOffers.status} in ('cancelled', 'timed_out') and ${tradeOffers.endedAt} >= ${since}`,
      ),
      disputed: counted(sql`${tradeOffers.status} = 'disputed'`),
    })
    .from(tradeOffers)
    .where(eq(tradeOffers.kind, "trade"));
  if (row === undefined) throw new Error("aggregate returned no row");
  return row;
}
