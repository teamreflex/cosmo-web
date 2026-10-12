import type { WebTx } from "@/db";
import { DatabaseIndexer } from "@/db-indexer";
import { objekts } from "@apollo/database/indexer/schema";
import {
  lockedObjekts,
  notifications,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import type {
  NewNotification,
  TradeEvent as StoredTradeEvent,
  TradeNotificationType,
} from "@apollo/database/web/types";
import { TRADE_EVENTS_CHANNEL, type TradeUpdate } from "@apollo/trades/events";
import {
  listingEventAfter,
  listingTransition,
  type TradeState,
  tradeState,
} from "@apollo/trades/lifecycle";
import { addr } from "@apollo/util";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { Redis } from "effect/persistence";

/**
 * Locks every user a trade write may notify, in one statement ordered by id,
 * before any trade or listing row (the lock order in docs/auth.md). An
 * account deletion locks its user `FOR UPDATE` before updating their
 * listings, so it now waits for this transaction or makes it wait, instead of
 * deadlocking on a notification's foreign key. `FOR SHARE` also holds off a
 * ban's update of the row, for a caller that must not act on a party banned
 * meanwhile. Returns the ids whose account still exists.
 */
export const lockUsers = Effect.fn("lockUsers")(function* (
  tx: WebTx,
  userIds: readonly (string | null)[],
  strength: "key share" | "share",
) {
  const ids = [...new Set(userIds.flatMap((id) => id ?? []))];
  if (ids.length === 0) return new Set<string>();
  const rows = yield* tx
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.id, ids))
    .orderBy(asc(user.id))
    .for(strength);
  return new Set(rows.map((row) => row.id));
});

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
) {
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
      abandonedBy: tradeOffers.abandonedBy,
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
    if (toAddress === null)
      throw new Error(`trade ${row.id} has no to_address`);
    const tradeItems = itemsByTrade.get(row.id) ?? [];
    return {
      ...row,
      toAddress,
      items: tradeItems,
      state: tradeState(row, tradeItems),
    };
  });
});

export type LiveTrade = Effect.Success<
  ReturnType<typeof lockLiveTrades>
>[number];

/**
 * Whether the poster could offer every token again: each is still theirs in
 * the indexer and transferable, not locked by them and in no live trade. The
 * same facts the web app's `firstRefusal` checks.
 */
const posterHolds = Effect.fn("posterHolds")(function* (
  tx: WebTx,
  fromAddress: string,
  tokenIds: readonly number[],
) {
  const indexer = yield* DatabaseIndexer;
  const owned = yield* indexer
    .select({ id: objekts.id })
    .from(objekts)
    .where(
      and(
        inArray(objekts.id, tokenIds.map(String)),
        eq(objekts.owner, addr(fromAddress)),
        eq(objekts.transferable, true),
      ),
    );
  if (owned.length < tokenIds.length) return false;

  const locked = yield* tx.$count(
    lockedObjekts,
    and(
      eq(lockedObjekts.address, fromAddress),
      eq(lockedObjekts.locked, true),
      inArray(lockedObjekts.tokenId, [...tokenIds]),
    ),
  );
  const live = yield* tx.$count(
    tradeOfferItems,
    and(
      eq(tradeOfferItems.live, true),
      inArray(tradeOfferItems.tokenId, [...tokenIds]),
    ),
  );
  return locked === 0 && live === 0;
});

/**
 * Ends a locked trade in the state a transition returned: its row, its
 * items' reservations, and each listing it came from (listingEventAfter),
 * locked in id order before their guarded updates. Whether the poster holds
 * a released listing is read only for a release, once this trade no longer
 * reserves its tokens. A banned poster never reaches here: the drain only
 * completes trades, which fills the listing whoever posted it, and
 * trade-timers skips trades with a banned party.
 */
export const endTrade = Effect.fn("endTrade")(function* (
  tx: WebTx,
  trade: LiveTrade,
  next: TradeState,
) {
  const [ended] = yield* tx
    .update(tradeOffers)
    .set({
      status: next.status,
      endedAt: sql`now()`,
      cancelledBy: next.status === "cancelled" ? next.cancelledBy : null,
      abandonedBy: next.status === "timed_out" ? next.abandonedBy : null,
    })
    .where(
      and(
        eq(tradeOffers.id, trade.id),
        eq(tradeOffers.status, trade.state.status),
      ),
    )
    .returning({ id: tradeOffers.id });
  if (!ended)
    return yield* Effect.die(`trade ${trade.id} changed under its lock`);

  yield* tx
    .update(tradeOfferItems)
    .set({ live: false })
    .where(
      and(
        eq(tradeOfferItems.offerId, trade.id),
        eq(tradeOfferItems.live, true),
      ),
    );

  const listings = Map.groupBy(
    trade.items.flatMap(({ listingId, tokenId }) =>
      listingId === null || tokenId === null ? [] : [{ listingId, tokenId }],
    ),
    (item) => item.listingId,
  );
  if (listings.size === 0) return;

  yield* tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(inArray(tradeOffers.id, [...listings.keys()]))
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
  for (const [listingId, tokens] of listings) {
    let event = listingEventAfter(next, { banned: false });
    if (event === undefined) continue;
    if (event === "release") {
      event = (yield* posterHolds(
        tx,
        trade.fromAddress,
        tokens.map((token) => token.tokenId),
      ))
        ? "reopen"
        : "break";
    }

    const { from, to } = listingTransition(event);
    yield* tx
      .update(tradeOffers)
      .set({ status: to, endedAt: event === "reopen" ? null : sql`now()` })
      .where(
        and(
          eq(tradeOffers.id, listingId),
          eq(tradeOffers.kind, "listing"),
          inArray(tradeOffers.status, [...from]),
        ),
      );
  }
});

/**
 * Appends timeline events to a trade's message stream, in order.
 */
export const insertTradeEvents = Effect.fn("insertTradeEvents")(function* (
  tx: WebTx,
  tradeId: string,
  events: readonly StoredTradeEvent[],
) {
  if (events.length === 0) return;
  yield* tx.insert(tradeMessages).values(
    events.map((event): typeof tradeMessages.$inferInsert => ({
      tradeId,
      kind: "event",
      event,
    })),
  );
});

export type TradeNotification = Omit<
  Extract<NewNotification, { type: TradeNotificationType }>,
  "userId"
> & { userId: string | null };

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
    locked: ReadonlySet<string>,
    rows: readonly TradeNotification[],
  ) {
    const recipients = rows.flatMap(({ userId, ...row }) =>
      userId !== null && locked.has(userId) ? [{ ...row, userId }] : [],
    );
    if (recipients.length === 0) return;

    // isBanActive in @apollo/auth/guard, which this app doesn't depend on
    const banned = yield* tx
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          inArray(user.id, [...new Set(recipients.map((row) => row.userId))]),
          eq(user.banned, true),
          or(isNull(user.banExpires), gt(user.banExpires, sql`now()`)),
        ),
      );
    const bannedIds = new Set(banned.map((row) => row.id));
    const values = recipients.filter((row) => !bannedIds.has(row.userId));
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
      redis.send(
        "PUBLISH",
        TRADE_EVENTS_CHANNEL,
        JSON.stringify({ type: "updated", tradeId } satisfies TradeUpdate),
      ),
    { discard: true },
  );
});
