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
import { bumpUpdatedAt } from "@apollo/database/web/sql";
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
  canOfferAll,
  type TokenFlags,
  type TokenOwnership,
} from "@apollo/trades/holdings";
import {
  endedTradeColumns,
  type ListingEvent,
  listingEventAfter,
  listingTransition,
  tradeListings,
  type TradeState,
  tradeState,
} from "@apollo/trades/lifecycle";
import { and, asc, eq, inArray, type SQL, sql } from "drizzle-orm";
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
  | "abandonedBy"
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
 * Which of the tokens the address has locked, and which a live trade holds,
 * as the web app's readWebTokenFlags reads them.
 */
const readTokenFlags = Effect.fn("readTokenFlags")(function* (
  tx: WebTx,
  address: string,
  tokenIds: readonly number[],
) {
  const locked = yield* tx
    .selectDistinct({ tokenId: lockedObjekts.tokenId })
    .from(lockedObjekts)
    .where(
      and(
        eq(lockedObjekts.address, address),
        eq(lockedObjekts.locked, true),
        inArray(lockedObjekts.tokenId, [...tokenIds]),
      ),
    );
  const live = yield* tx
    .select({ tokenId: tradeOfferItems.tokenId })
    .from(tradeOfferItems)
    .where(
      and(
        eq(tradeOfferItems.live, true),
        inArray(tradeOfferItems.tokenId, [...tokenIds]),
      ),
    );
  return {
    locked: new Set(locked.map((row) => row.tokenId)),
    live: new Set(live.flatMap((row) => row.tokenId ?? [])),
  } satisfies TokenFlags;
});

/**
 * Reads who holds each of the trades' listing tokens in the indexer, for
 * endTrade to decide whether a released listing reopens. One read for the
 * whole batch, since the web transaction waits on it.
 */
export const readListingTokens = Effect.fn("readListingTokens")(function* (
  trades: readonly LiveTrade[],
) {
  const tokenIds = trades.flatMap((trade) =>
    [...tradeListings(trade.items).values()].flat(),
  );
  if (tokenIds.length === 0) return new Map<number, TokenOwnership>();
  const indexer = yield* DatabaseIndexer;
  const rows = yield* indexer
    .select({
      id: objekts.id,
      owner: objekts.owner,
      transferable: objekts.transferable,
    })
    .from(objekts)
    .where(inArray(objekts.id, tokenIds.map(String)));
  return new Map(
    rows.map((row): [number, TokenOwnership] => [
      Number(row.id),
      {
        kind: "found",
        tokenId: Number(row.id),
        owner: row.owner,
        transferable: row.transferable,
      },
    ]),
  );
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
        event: { type: "timed_out", abandoned: next.abandonedBy },
        type: "trade_timed_out",
      };
    default:
      return undefined;
  }
}

/**
 * Ends a locked trade that completed or timed out: its row, its items'
 * reservations, and each listing it came from (listingEventAfter), locked in
 * id order before their guarded updates. A released listing reopens when the
 * poster could offer every token again now that this trade no longer
 * reserves them; `tokens` is readListingTokens' read, which a fill doesn't
 * need. `locked` is lockUsers' map, which says whether the poster is banned.
 * Returns the trade's timeline event and both parties' notifications.
 */
export const endTrade = Effect.fn("endTrade")(function* (
  tx: WebTx,
  trade: LiveTrade,
  next: TradeState,
  locked: ReadonlyMap<string, boolean>,
  tokens: ReadonlyMap<number, TokenOwnership>,
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
  const outcome = listingEventAfter(next, {
    banned: trade.fromUserId !== null && locked.get(trade.fromUserId) === true,
  });
  if (outcome !== undefined && listings.size > 0) {
    yield* updateListings(tx, trade.fromAddress, listings, outcome, tokens);
  }

  return {
    event: { tradeId: trade.id, event: ending.event } satisfies TradeEventRow,
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
 * Moves each listing an ended trade came from to its outcome, locking them in
 * id order first. A release reopens a listing whose poster could offer every
 * token again, else breaks it.
 */
const updateListings = Effect.fn("updateListings")(function* (
  tx: WebTx,
  fromAddress: string,
  listings: ReadonlyMap<string, number[]>,
  outcome: ListingEvent | "release",
  tokens: ReadonlyMap<number, TokenOwnership>,
) {
  yield* tx
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(inArray(tradeOffers.id, [...listings.keys()]))
    .orderBy(asc(tradeOffers.id))
    .for("no key update");
  for (const [listingId, tokenIds] of listings) {
    let event = outcome;
    if (event === "release") {
      const flags = yield* readTokenFlags(tx, fromAddress, tokenIds);
      event = canOfferAll(tokenIds, tokens, fromAddress, flags)
        ? "reopen"
        : "break";
    }

    const { from, to } = listingTransition(event);
    yield* tx
      .update(tradeOffers)
      .set({
        status: to,
        endedAt: event === "reopen" ? null : sql`now()`,
        updatedAt: bumpUpdatedAt,
      })
      .where(
        and(
          eq(tradeOffers.id, listingId),
          eq(tradeOffers.kind, "listing"),
          inArray(tradeOffers.status, [...from]),
        ),
      );
  }
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
