import {
  notifications,
  reports,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt, listingPoolState } from "@apollo/database/web/sql";
import type {
  NewTradeNotification,
  TradeEvent as StoredTradeEvent,
  TradeNotificationType,
  TradeOffer,
  TradeOfferItem,
} from "@apollo/database/web/types";
import type { WebTx } from "@apollo/services/database-web";
import {
  TRADE_EVENTS_CHANNEL,
  tradeUpdateMessage,
} from "@apollo/trades/events";
import {
  endedTradeColumns,
  listingClosing,
  listingTransition,
  listingUnitSize,
  tradeListings,
  type TradeState,
  tradeState,
  waitingSide,
} from "@apollo/trades/lifecycle";
import { and, asc, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Effect } from "effect";
import { Redis } from "effect/persistence";

/**
 * The user row has an active ban: isBanActive in @apollo/auth/guard, which
 * this app doesn't depend on.
 */
const banActive = sql<boolean>`(${user.banned} and (${user.banExpires} is null or ${user.banExpires} > now()))`;

/**
 * Locks every user a trade write may notify `FOR KEY SHARE`, in one
 * statement ordered by id, before any trade or listing row (the lock order in
 * docs/auth.md). An account deletion locks its user `FOR UPDATE` before
 * updating their listings, so it now waits for this transaction or makes it
 * wait, instead of deadlocking on a notification's foreign key. Maps each
 * user whose account still exists to whether they're banned.
 */
export const lockUsers = Effect.fn("lockUsers")(function* (
  tx: WebTx,
  userIds: readonly (string | null)[],
) {
  const ids = [...new Set(userIds.flatMap((id) => id ?? []))];
  if (ids.length === 0) return new Map<string, boolean>();
  const rows = yield* tx
    .select({ id: user.id, banned: banActive })
    .from(user)
    .where(inArray(user.id, ids))
    .orderBy(asc(user.id))
    .for("key share");
  return new Map(rows.map((row) => [row.id, row.banned]));
});

/**
 * A live trade as lockLiveTrades reads it under its lock: the row, its items
 * in id order, and the state transitions take.
 */
export type LiveTrade = Pick<
  TradeOffer,
  | "id"
  | "status"
  | "fromUserId"
  | "toUserId"
  | "fromAddress"
  | "cancelledBy"
  | "proposedBy"
> & {
  toAddress: string;
  items: Pick<
    TradeOfferItem,
    | "id"
    | "offerId"
    | "kind"
    | "sender"
    | "tokenId"
    | "listingId"
    | "live"
    | "transferredAt"
    | "markedPaidAt"
    | "confirmedAt"
  >[];
  state: TradeState;
};

/**
 * Locks the accepted or disputed trades among the ids `FOR NO KEY UPDATE` in
 * id order, and reads their items in id order with the state transitions
 * take. Trades that ended since the caller's unlocked read are left out, and
 * so are those failing `recheck`, the caller's own condition re-read under
 * the lock.
 */
export const lockLiveTrades = Effect.fn("lockLiveTrades")(function* (
  tx: WebTx,
  tradeIds: readonly string[],
  recheck?: SQL,
): Effect.fn.Return<LiveTrade[], EffectDrizzleQueryError> {
  if (tradeIds.length === 0) return [];
  const rows = yield* tx
    .select({
      id: tradeOffers.id,
      status: tradeOffers.status,
      fromUserId: tradeOffers.fromUserId,
      toUserId: tradeOffers.toUserId,
      fromAddress: tradeOffers.fromAddress,
      toAddress: tradeOffers.toAddress,
      cancelledBy: tradeOffers.cancelledBy,
      proposedBy: tradeOffers.proposedBy,
    })
    .from(tradeOffers)
    .where(
      and(
        inArray(tradeOffers.id, [...tradeIds]),
        eq(tradeOffers.kind, "trade"),
        inArray(tradeOffers.status, ["accepted", "disputed"]),
        recheck,
      ),
    )
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
  if (rows.length === 0) return [];

  const items = yield* tx
    .select({
      id: tradeOfferItems.id,
      offerId: tradeOfferItems.offerId,
      kind: tradeOfferItems.kind,
      sender: tradeOfferItems.sender,
      tokenId: tradeOfferItems.tokenId,
      listingId: tradeOfferItems.listingId,
      live: tradeOfferItems.live,
      transferredAt: tradeOfferItems.transferredAt,
      markedPaidAt: tradeOfferItems.markedPaidAt,
      confirmedAt: tradeOfferItems.confirmedAt,
    })
    .from(tradeOfferItems)
    .where(
      inArray(
        tradeOfferItems.offerId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(tradeOfferItems.id));
  const itemsByTrade = Map.groupBy(items, (item) => item.offerId);

  return rows.map(({ toAddress, ...row }) => {
    // trade_offers_trade_chk: a trade always pins the claimer's address
    if (toAddress === null) {
      throw new Error(`trade ${row.id} has no to_address`);
    }
    const tradeItems = itemsByTrade.get(row.id) ?? [];
    return {
      ...row,
      toAddress,
      items: tradeItems,
      state: tradeState(row, tradeItems),
    } satisfies LiveTrade;
  });
});

/**
 * The timeline event a trade ending without a party's action posts, and the
 * notification both parties get.
 */
type TradeEnding = { event: StoredTradeEvent; type: TradeNotificationType };

function tradeEnding(next: TradeState): TradeEnding | undefined {
  switch (next.status) {
    case "completed":
      return {
        event: { type: "completed", by: null },
        type: "trade_completed",
      };
    case "timed_out":
      return {
        event: { type: "timed_out" },
        type: "trade_timed_out",
      };
    default:
      return undefined;
  }
}

/**
 * Ends a locked trade that completed or timed out: its row, its items'
 * reservations, and each listing its poster's objekts came from, locked in
 * id order. A completed trade's objekts leave each listing's pool, since
 * they were given, and stay on it as history (`left_at`); a timed-out
 * one's are free in the pool again. Returns the trade's timeline event,
 * both parties' notifications and the listings, which the caller closes
 * once its batch has ended every trade (closeSpentListings), since one
 * live trade from a listing keeps it open.
 */
export const endTrade = Effect.fn("endTrade")(function* (
  tx: WebTx,
  trade: LiveTrade,
  next: TradeState,
) {
  const ending = tradeEnding(next);
  if (ending === undefined) {
    return yield* Effect.die(`trade ${trade.id} can't end as ${next.status}`);
  }

  const [ended] = yield* tx
    .update(tradeOffers)
    .set({ ...endedTradeColumns(next), endedAt: sql`now()` })
    .where(
      and(
        eq(tradeOffers.id, trade.id),
        eq(tradeOffers.status, trade.state.status),
      ),
    )
    .returning({ id: tradeOffers.id });
  if (!ended) {
    return yield* Effect.die(`trade ${trade.id} changed under its lock`);
  }

  yield* tx
    .update(tradeOfferItems)
    .set({ live: false })
    .where(
      and(
        eq(tradeOfferItems.offerId, trade.id),
        eq(tradeOfferItems.live, true),
      ),
    );

  const listings = tradeListings(trade.items);
  if (listings.size > 0) {
    yield* lockListings(tx, [...listings.keys()]);
    if (next.status === "completed") {
      yield* tx
        .update(tradeOfferItems)
        .set({ leftAt: sql`now()` })
        .where(
          and(
            or(
              ...[...listings].map(([listingId, tokenIds]) =>
                and(
                  eq(tradeOfferItems.offerId, listingId),
                  inArray(tradeOfferItems.tokenId, tokenIds),
                ),
              ),
            ),
            isNull(tradeOfferItems.leftAt),
          ),
        );
    }
  }

  return {
    event: { tradeId: trade.id, event: ending.event } satisfies TradeEventRow,
    listingIds: [...listings.keys()],
    notifications: [trade.fromUserId, trade.toUserId].map(
      (userId): TradeNotification => ({
        type: ending.type,
        userId,
        offerId: trade.id,
        actorId: null,
        tokenId: null,
      }),
    ),
  };
});

/**
 * Locks the open listings among the ids `FOR NO KEY UPDATE` in id order,
 * after the trades (docs/auth.md), and returns them with their posters.
 */
export const lockListings = Effect.fn("lockListings")(function* (
  tx: WebTx,
  listingIds: readonly string[],
) {
  return yield* tx
    .select({ id: tradeOffers.id, fromUserId: tradeOffers.fromUserId })
    .from(tradeOffers)
    .where(
      and(
        inArray(tradeOffers.id, [...listingIds]),
        eq(tradeOffers.kind, "listing"),
        eq(tradeOffers.status, "open"),
      ),
    )
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
});

/**
 * Closes the open listings among `listingIds` whose pool can no longer make
 * a unit and that have no live trade left (listingClosing): filled when one
 * of their trades completed, else broken. The caller holds their locks and
 * their posters'. Returns how many broke and a `listing_closed` notification
 * to each broken one's poster, naming the token `departed` says left its
 * pool, or none when no single token broke it.
 */
export const closeSpentListings = Effect.fn("closeSpentListings")(function* (
  tx: WebTx,
  listingIds: readonly string[],
  departed: ReadonlyMap<string, { tokenId: number }> = new Map(),
) {
  if (listingIds.length === 0) return { broken: 0, notifications: [] };
  const listings = yield* tx
    .select({
      id: tradeOffers.id,
      fromUserId: tradeOffers.fromUserId,
      unitSize: tradeOffers.unitSize,
      ...listingPoolState,
    })
    .from(tradeOffers)
    .where(
      and(
        inArray(tradeOffers.id, [...listingIds]),
        eq(tradeOffers.kind, "listing"),
        eq(tradeOffers.status, "open"),
      ),
    );
  const closed = listings.flatMap((listing) => {
    const event = listingClosing({
      ...listing,
      unitSize: listingUnitSize(listing),
    });
    return event === null
      ? []
      : [{ id: listing.id, fromUserId: listing.fromUserId, event }];
  });
  for (const [event, rows] of Map.groupBy(closed, ({ event }) => event)) {
    const { from, to } = listingTransition(event);
    yield* tx
      .update(tradeOffers)
      .set({ status: to, endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
      .where(
        and(
          inArray(
            tradeOffers.id,
            rows.map(({ id }) => id),
          ),
          inArray(tradeOffers.status, [...from]),
        ),
      );
  }
  const broken = closed.filter(({ event }) => event === "break");
  return {
    broken: broken.length,
    notifications: broken.map(({ id, fromUserId }): TradeNotification => ({
      type: "listing_closed",
      userId: fromUserId,
      offerId: id,
      actorId: null,
      tokenId: departed.get(id)?.tokenId ?? null,
    })),
  };
});

/**
 * Freezes a locked live trade whose deadline passed with something sent and
 * something still owed under a dispute nobody filed, as transition(time_out)
 * decided: a side may be out of pocket, so staff settle it. Files its
 * `deadline_passed` report, naming as its reporter the side that sent
 * everything it owed (none when both sent part), and returns the timeline
 * event and both parties' notifications, which read as a pause for review.
 */
export const disputeAtDeadline = Effect.fn("disputeAtDeadline")(function* (
  tx: WebTx,
  trade: LiveTrade,
) {
  const reporter = waitingSide(trade.state.items);
  const [report] = yield* tx
    .insert(reports)
    .values({
      reporterId:
        reporter === null
          ? null
          : reporter === "from"
            ? trade.fromUserId
            : trade.toUserId,
      reason: "deadline_passed",
      targetType: "trade",
      targetId: trade.id,
    })
    .returning({ id: reports.id });
  if (!report) return yield* Effect.die("report insert returned no row");

  const [disputed] = yield* tx
    .update(tradeOffers)
    .set({
      status: "disputed",
      disputeReportId: report.id,
      updatedAt: bumpUpdatedAt,
    })
    .where(
      and(
        eq(tradeOffers.id, trade.id),
        eq(tradeOffers.status, trade.state.status),
      ),
    )
    .returning({ id: tradeOffers.id });
  if (!disputed) {
    return yield* Effect.die(`trade ${trade.id} changed under its lock`);
  }

  return {
    event: {
      tradeId: trade.id,
      event: { type: "disputed", by: "deadline", reportId: report.id },
    } satisfies TradeEventRow,
    notifications: [trade.fromUserId, trade.toUserId].map(
      (userId): TradeNotification => ({
        type: "trade_disputed",
        userId,
        offerId: trade.id,
        actorId: null,
        tokenId: null,
      }),
    ),
  };
});

// a timeline event bound for a trade's message stream
export type TradeEventRow = { tradeId: string; event: StoredTradeEvent };

/**
 * Appends timeline events to a trade's message stream, in order.
 */
export const insertTradeEvents = Effect.fn("insertTradeEvents")(function* (
  tx: WebTx,
  events: readonly TradeEventRow[],
) {
  if (events.length === 0) return;
  yield* tx.insert(tradeMessages).values(
    events.map(({ tradeId, event }): typeof tradeMessages.$inferInsert => ({
      tradeId,
      kind: "event",
      event,
    })),
  );
});

export type TradeNotification = NewTradeNotification & {
  userId: string | null;
};

/**
 * Inserts trade and listing notifications inside the caller's transaction,
 * skipping recipients that `lockUsers` didn't return (gone, or never
 * locked) and recipients with an active ban. Never call insertNotifications
 * or the pool here: the web client has one connection, which the
 * transaction holds, so the call would wait forever.
 */
export const insertTradeNotifications = Effect.fn("insertTradeNotifications")(
  function* (
    tx: WebTx,
    locked: ReadonlyMap<string, boolean>,
    rows: readonly TradeNotification[],
  ) {
    const values = rows.flatMap(({ userId, ...row }) =>
      userId !== null && locked.get(userId) === false
        ? [{ ...row, userId }]
        : [],
    );
    if (values.length > 0) yield* tx.insert(notifications).values(values);
  },
);

/**
 * Announces trades whose rows changed on the `trade-events` channel, once
 * the transaction that changed them has committed.
 */
export const publishTradeUpdates = Effect.fn("publishTradeUpdates")(function* (
  tradeIds: readonly string[],
) {
  const redis = yield* Redis.Redis;
  yield* Effect.forEach(
    tradeIds,
    (tradeId) =>
      redis.send("PUBLISH", TRADE_EVENTS_CHANNEL, tradeUpdateMessage(tradeId)),
    { concurrency: "unbounded", discard: true },
  );
});
