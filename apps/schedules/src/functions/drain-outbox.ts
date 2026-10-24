import { DatabaseIndexer } from "@/db-indexer";
import {
  type BatchPlan,
  type OutboxRow,
  parseOutboxRow,
  planBatch,
} from "@/outbox";
import {
  endTrade,
  insertTradeEvents,
  insertTradeNotifications,
  type LiveTrade,
  lockLiveTrades,
  lockUsers,
  publishTradeUpdates,
  type TradeEventRow,
  type TradeNotification,
} from "@/trades";
import { listEventOutbox, transfers } from "@apollo/database/indexer/schema";
import {
  binderEntries,
  binders,
  listDrainCursor,
  objektListEntries,
  pins,
  tradeOfferItems,
  tradeOffers,
} from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import type { TradeSide } from "@apollo/database/web/types";
import { DatabaseWeb, type WebTx } from "@apollo/services/database-web";
import { offerTransition, transition } from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME } from "@apollo/trades/timers";
import {
  type ChainRow,
  type ExpectedItem,
  foldTransfers,
  type TradeChainEvent,
} from "@apollo/trades/transfers";
import { pinCacheKey } from "@apollo/util-server";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  max,
  or,
  sql,
} from "drizzle-orm";
import { Data, Effect } from "effect";
import { Redis } from "effect/persistence";
import type { ScheduledTask } from "../task";

const BATCH_SIZE = 1000;

export class MalformedOutboxRowError extends Data.TaggedError(
  "MalformedOutboxRowError",
)<{
  id: bigint;
}> {}

/**
 * Process one drain batch. Returns the number of outbox rows pulled so the
 * caller can keep looping while we're still hitting the BATCH_SIZE ceiling.
 *
 * Exactly-once: the cursor row is locked first, and the batch is read past
 * the locked value. The deletes, the trade writes and the cursor advance
 * commit together, so a crash rolls them all back, and an overlapping run
 * waits on the lock and then reads past the advanced cursor. Trade updates
 * are published only after the commit.
 */
const processBatch = Effect.gen(function* () {
  const indexerDb = yield* DatabaseIndexer;
  const webDb = yield* DatabaseWeb;
  const redis = yield* Redis.Redis;

  const result = yield* webDb.transaction((tx) =>
    Effect.gen(function* () {
      const fromSeq = yield* lockCursor(tx);

      const rawRows = yield* indexerDb
        .select({
          id: listEventOutbox.id,
          type: listEventOutbox.type,
          tokenId: listEventOutbox.tokenId,
          transferId: listEventOutbox.transferId,
          fromAddress: listEventOutbox.fromAddress,
          toAddress: listEventOutbox.toAddress,
          transferable: listEventOutbox.transferable,
          timestamp: listEventOutbox.timestamp,
          hash: transfers.hash,
        })
        .from(listEventOutbox)
        .leftJoin(transfers, eq(transfers.id, listEventOutbox.transferId))
        .where(gt(listEventOutbox.id, fromSeq))
        .orderBy(listEventOutbox.id)
        .limit(BATCH_SIZE);

      const rows = yield* Effect.forEach(rawRows, (raw) => {
        const row = parseOutboxRow(raw);
        return row === undefined
          ? Effect.fail(new MalformedOutboxRowError({ id: raw.id }))
          : Effect.succeed(row);
      });

      const plan = planBatch(rows);
      if (plan === undefined) return { fromSeq, plan };

      const applied = yield* applyPlan(tx, plan);
      const trades = yield* applyTrades(tx, rows);

      yield* tx
        .update(listDrainCursor)
        .set({
          seq: plan.seq,
          // greatest() skips a null, so the first drain sets it
          chainTime: sql`greatest(${listDrainCursor.chainTime}, ${plan.chainTime.toISOString()}::timestamptz)`,
        })
        .where(eq(listDrainCursor.name, DRAIN_CURSOR_NAME));

      return { fromSeq, rowCount: rows.length, plan, trades, ...applied };
    }),
  );

  if (result.plan === undefined) {
    yield* warnIfCursorAhead(result.fromSeq);
    yield* purgeOutbox(result.fromSeq);
    return 0;
  }

  if (result.cacheKeys.length > 0) {
    yield* redis.send("DEL", ...result.cacheKeys);
  }
  yield* publishTradeUpdates(result.trades.tradeIds);

  yield* purgeOutbox(result.plan.seq);

  yield* Effect.logInfo(
    `Drained ${result.rowCount} outbox rows (${result.plan.transfers} transfers, ${result.plan.transferabilityChanges} transferability changes) up to ${result.plan.seq} at chain time ${result.plan.chainTime.toISOString()}: cleared ${result.plan.clearTokenIds.length} tokens, deleted ${result.binderEntries} binder entries, cleared ${result.covers} binder covers, busted ${result.cacheKeys.length} pin cache keys; touched ${result.trades.tradeIds.length} trades (recorded ${result.trades.transferred} transfers, completed ${result.trades.completed}, marked ${result.trades.stale} offers stale), broke ${result.trades.broken} listings`,
  );

  return result.rowCount;
});

/**
 * Drain the indexer outbox, deleting live have-list entries, pins and
 * binder entries for every objekt that left the sender's address, applying
 * each row to the trades and listings holding its token, and recording the
 * newest chain time drained. Loops back-to-back while the
 * last batch saturated the limit, so backlog catches up within a single tick
 * instead of bleeding out one BATCH_SIZE at a time across cron ticks.
 */
export const drainOutboxTask = {
  name: "drain-outbox",
  cron: "*/1 * * * *",
  effect: Effect.repeat(processBatch, {
    while: (rowCount) => rowCount === BATCH_SIZE,
  }),
} satisfies ScheduledTask;

/**
 * Lock the cursor row for the rest of the transaction and return its seq,
 * creating it at 0 on the first run.
 */
const lockCursor = (tx: WebTx) =>
  Effect.gen(function* () {
    yield* tx
      .insert(listDrainCursor)
      .values({ name: DRAIN_CURSOR_NAME, seq: 0n })
      .onConflictDoNothing();

    const [cursor] = yield* tx
      .select({ seq: listDrainCursor.seq })
      .from(listDrainCursor)
      .where(eq(listDrainCursor.name, DRAIN_CURSOR_NAME))
      .for("update");

    return cursor?.seq ?? 0n;
  });

/**
 * Delete the entries, pins and binder slots of every cleared token, and
 * collect the pin cache keys those deletes make stale.
 */
const applyPlan = (tx: WebTx, plan: BatchPlan) =>
  Effect.gen(function* () {
    const tokenIds = plan.clearTokenIds;
    if (tokenIds.length === 0) {
      return { cacheKeys: [], binderEntries: 0, covers: 0 };
    }
    const numericTokenIds = tokenIds.map(Number);

    // partial unique index on (tokenId, objektListId) makes this an index lookup
    yield* tx
      .delete(objektListEntries)
      .where(inArray(objektListEntries.tokenId, tokenIds));

    const deletedPins = yield* tx
      .delete(pins)
      .where(inArray(pins.tokenId, numericTokenIds))
      .returning({ address: pins.address });

    // objekts can only be placed by their owner, so a transfer out
    // empties the pocket. other entries keep their page and slot.
    const deletedBinderEntries = yield* tx
      .delete(binderEntries)
      .where(inArray(binderEntries.tokenId, numericTokenIds))
      .returning({
        binderId: binderEntries.binderId,
        page: binderEntries.page,
      });

    // cleared covers fall back to the page 1 collage
    const clearedCovers = yield* tx
      .update(binders)
      .set({ coverTokenId: null, updatedAt: new Date() })
      .where(inArray(binders.coverTokenId, numericTokenIds))
      .returning({ id: binders.id });

    if (deletedBinderEntries.length > 0) {
      yield* tx
        .update(binders)
        .set({ updatedAt: new Date() })
        .where(
          inArray(
            binders.id,
            deletedBinderEntries.map((e) => e.binderId),
          ),
        );
    }

    // pinned binders preview page 1 or their cover
    const previewChangedBinderIds = [
      ...new Set([
        ...deletedBinderEntries
          .filter((e) => e.page === 0)
          .map((e) => e.binderId),
        ...clearedCovers.map((b) => b.id),
      ]),
    ];
    const binderPins =
      previewChangedBinderIds.length > 0
        ? yield* tx.query.pins.findMany({
            where: { binderId: { in: previewChangedBinderIds } },
            columns: { address: true },
          })
        : [];

    const counts = {
      binderEntries: deletedBinderEntries.length,
      covers: clearedCovers.length,
    };

    const addresses = [
      ...new Set([...deletedPins, ...binderPins].map((p) => p.address)),
    ];
    if (addresses.length === 0) return { cacheKeys: [], ...counts };

    const accounts = yield* tx.query.cosmoAccounts.findMany({
      where: { address: { in: addresses } },
      columns: { address: true, username: true },
    });

    // bust both address-keyed and username-keyed cache entries since
    // either can be requested by the web app.
    return {
      cacheKeys: accounts.flatMap((a) => [
        pinCacheKey(a.address),
        pinCacheKey(a.username),
      ]),
      ...counts,
    };
  });

/**
 * Apply a batch to the trades and listings holding its tokens, through
 * foldTransfers. A transfer to a live item's receiver records it, with the
 * hash from the indexer's `transfer` row, and completes the trade once
 * nothing is owed, which fills its listing. A token moved elsewhere or made
 * untransferable posts an event on its live trade without notifying anyone,
 * breaks each open listing offering it with a `listing_closed` notification
 * to its poster, and turns each pending offer holding it stale with an event
 * and an `offer_stale` notification to its sender. A transfer whose
 * `transfer` row is gone was rolled back with a hot block, so it doesn't
 * count here.
 *
 * Locks, after the cursor: every user it may notify `FOR KEY SHARE`, then the
 * live trades, then the pending offers, then listings (docs/auth.md). The
 * candidate read before them is unlocked; a trade that ended since is dropped
 * by its lock, and an offer accepted or a listing claimed since keeps its
 * status, since breaks only touch pending offers and open listings.
 */
const applyTrades = (tx: WebTx, rows: readonly OutboxRow[]) =>
  Effect.gen(function* () {
    const candidates = yield* tx
      .select({
        tokenId: tradeOfferItems.tokenId,
        sender: tradeOfferItems.sender,
        live: tradeOfferItems.live,
        offerId: tradeOffers.id,
        kind: tradeOffers.kind,
        fromUserId: tradeOffers.fromUserId,
        toUserId: tradeOffers.toUserId,
        fromAddress: tradeOffers.fromAddress,
        toAddress: tradeOffers.toAddress,
      })
      .from(tradeOfferItems)
      .innerJoin(tradeOffers, eq(tradeOffers.id, tradeOfferItems.offerId))
      .where(
        and(
          inArray(tradeOfferItems.tokenId, [
            ...new Set(rows.map((row) => Number(row.tokenId))),
          ]),
          or(
            eq(tradeOfferItems.live, true),
            and(
              eq(tradeOffers.kind, "listing"),
              eq(tradeOffers.status, "open"),
            ),
            and(
              eq(tradeOffers.kind, "trade"),
              eq(tradeOffers.status, "pending"),
            ),
          ),
        ),
      );
    if (candidates.length === 0) {
      return {
        tradeIds: [],
        transferred: 0,
        completed: 0,
        broken: 0,
        stale: 0,
      };
    }

    const locked = yield* lockUsers(
      tx,
      candidates.flatMap((item) =>
        item.live ? [item.fromUserId, item.toUserId] : [item.fromUserId],
      ),
    );
    const trades = yield* lockLiveTrades(tx, [
      ...new Set(candidates.flatMap((item) => (item.live ? item.offerId : []))),
    ]);

    const expected = expectedItems(trades, candidates);
    const chainRows = rows.flatMap((row) =>
      expected.has(Number(row.tokenId)) ? toChainRow(row) : [],
    );
    const folded = foldTransfers(chainRows, expected);

    const recorded = trades.flatMap((trade) => {
      const chainEvents = folded.trades.get(trade.id);
      return chainEvents === undefined
        ? []
        : [recordChainEvents(trade, chainEvents)];
    });
    const arrivals = recorded.flatMap((trade) => trade.arrivals);
    if (arrivals.length > 0) {
      const values = sql.join(
        arrivals.map(
          ({ itemId, at, hash }) =>
            sql`(${itemId}::bigint, ${at.toISOString()}::timestamptz, ${hash})`,
        ),
        sql`, `,
      );
      yield* tx
        .update(tradeOfferItems)
        .set({ transferredAt: sql`arrival.at`, txHash: sql`arrival.hash` })
        .from(sql`(VALUES ${values}) AS arrival (id, at, hash)`)
        .where(
          and(
            sql`${tradeOfferItems.id} = arrival.id`,
            eq(tradeOfferItems.live, true),
            isNull(tradeOfferItems.transferredAt),
          ),
        );
    }

    // pending offers and open listings, before completions lock their listings
    const broken = yield* breakOffers(tx, folded.breaks);
    const events = [
      ...recorded.flatMap((trade) => trade.events),
      ...broken.events,
    ];
    const notifications = [...broken.notifications];
    const { completed = [], pending = [] } = Object.groupBy(
      recorded,
      (trade) => (trade.state.status === "completed" ? "completed" : "pending"),
    );
    for (const { trade, state } of completed) {
      const ended = yield* endTrade(tx, trade, state, locked);
      events.push(ended.event);
      notifications.push(...ended.notifications);
    }
    if (pending.length > 0) {
      yield* tx
        .update(tradeOffers)
        .set({ updatedAt: bumpUpdatedAt })
        .where(
          inArray(
            tradeOffers.id,
            pending.map(({ trade }) => trade.id),
          ),
        );
    }

    yield* insertTradeEvents(tx, events);
    yield* insertTradeNotifications(tx, locked, notifications);
    return {
      tradeIds: [
        ...recorded.map(({ trade }) => trade.id),
        ...broken.events.map(({ tradeId }) => tradeId),
      ],
      transferred: arrivals.length,
      completed: completed.length,
      broken: broken.listings,
      stale: broken.events.length,
    };
  });

/**
 * The trade rows holding each of a batch's tokens: live items wait to move
 * between their trade's pinned addresses, and offered ones (on an open
 * listing or a pending offer) stay with their holder.
 */
function expectedItems(
  trades: readonly LiveTrade[],
  candidates: readonly {
    tokenId: number | null;
    sender: TradeSide;
    live: boolean;
    offerId: string;
    fromAddress: string;
    toAddress: string | null;
  }[],
) {
  const expected = new Map<number, ExpectedItem[]>();
  const add = (tokenId: number | null, item: ExpectedItem) => {
    if (tokenId === null) return;
    expected.set(tokenId, [...(expected.get(tokenId) ?? []), item]);
  };
  for (const trade of trades) {
    for (const item of trade.items) {
      if (!item.live) continue;
      const [from, to] =
        item.sender === "from"
          ? [trade.fromAddress, trade.toAddress]
          : [trade.toAddress, trade.fromAddress];
      add(item.tokenId, {
        kind: "live",
        itemId: item.id,
        tradeId: trade.id,
        from,
        to,
        transferred: item.transferredAt !== null,
      });
    }
  }
  for (const item of candidates) {
    const holder = item.sender === "from" ? item.fromAddress : item.toAddress;
    if (item.live || holder === null) continue;
    add(item.tokenId, { kind: "offered", offerId: item.offerId, from: holder });
  }
  return expected;
}

/**
 * An outbox row as foldTransfers reads it. A transfer that was rolled back
 * with a hot block has no hash and doesn't count.
 */
function toChainRow(row: OutboxRow): ChainRow[] {
  const tokenId = Number(row.tokenId);
  if (row.type === "transferability") {
    return [
      {
        type: "transferability",
        tokenId,
        transferable: row.transferable,
        timestamp: row.timestamp,
      },
    ];
  }
  return row.hash === null
    ? []
    : [
        {
          type: "transfer",
          tokenId,
          from: row.from,
          to: row.to,
          timestamp: row.timestamp,
          hash: row.hash,
        },
      ];
}

/**
 * One locked trade's events from a batch, in row order: each item that
 * arrived, and each token that moved elsewhere or turned untransferable,
 * which the trade page shows. Writes nothing; the caller applies every
 * trade's arrivals in one update and ends the trades left owing nothing.
 */
function recordChainEvents(
  trade: LiveTrade,
  chainEvents: readonly TradeChainEvent[],
) {
  let state = trade.state;
  const arrivals: { itemId: number; at: Date; hash: string }[] = [];
  const events: TradeEventRow[] = [];
  for (const event of chainEvents) {
    if (event.type === "transferred") {
      const result = transition(state, {
        type: "transfer",
        item: trade.items.findIndex((item) => item.id === event.itemId),
      });
      if (!result.ok) {
        throw new Error(
          `transfer of item ${event.itemId} refused on trade ${trade.id}: ${result.reason}`,
        );
      }
      state = result.trade;
      arrivals.push({ itemId: event.itemId, at: event.at, hash: event.hash });
      events.push({
        tradeId: trade.id,
        event: {
          type: "item_transferred",
          itemId: event.itemId,
          hash: event.hash,
        },
      });
      continue;
    }

    events.push({
      tradeId: trade.id,
      event: { type: event.type, tokenId: event.tokenId },
    });
  }
  return { trade, state, arrivals, events };
}

/**
 * Turn stale the pending offers and break the open listings whose token left
 * its holder or turned untransferable, locking the offers, then the listings,
 * each in id order (docs/auth.md). A stale offer gets a timeline event naming
 * the token and whether it moved or turned untransferable, and its sender
 * hears of it; each broken listing's poster hears which token closed it. An
 * offer accepted or a listing claimed since the unlocked read is left to its
 * trade.
 */
const breakOffers = (
  tx: WebTx,
  breaks: ReturnType<typeof foldTransfers>["breaks"],
) =>
  Effect.gen(function* () {
    if (breaks.size === 0) {
      return { events: [], notifications: [], listings: 0 };
    }
    const offerIds = [...breaks.keys()];
    const lock = (kind: "trade" | "listing", status: "pending" | "open") =>
      tx
        .select({ id: tradeOffers.id })
        .from(tradeOffers)
        .where(
          and(
            inArray(tradeOffers.id, offerIds),
            eq(tradeOffers.kind, kind),
            eq(tradeOffers.status, status),
          ),
        )
        .orderBy(asc(tradeOffers.id))
        .for("no key update");
    yield* lock("trade", "pending");
    yield* lock("listing", "open");

    const { from, to } = offerTransition("go_stale");
    const offers = yield* tx
      .update(tradeOffers)
      .set({ status: to, endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
      .where(
        and(
          inArray(tradeOffers.id, offerIds),
          eq(tradeOffers.kind, "trade"),
          eq(tradeOffers.status, from),
        ),
      )
      .returning({ id: tradeOffers.id, fromUserId: tradeOffers.fromUserId });
    const listings = yield* tx
      .update(tradeOffers)
      .set({ status: "broken", endedAt: sql`now()`, updatedAt: bumpUpdatedAt })
      .where(
        and(
          inArray(tradeOffers.id, offerIds),
          eq(tradeOffers.kind, "listing"),
          eq(tradeOffers.status, "open"),
        ),
      )
      .returning({ id: tradeOffers.id, fromUserId: tradeOffers.fromUserId });

    // the token that broke each stale offer, for its event and its sender
    const stale = offers.flatMap(({ id, fromUserId }) => {
      const broke = breaks.get(id);
      return broke === undefined ? [] : [{ id, fromUserId, ...broke }];
    });
    return {
      events: stale.map(({ id, tokenId, reason }): TradeEventRow => ({
        tradeId: id,
        event: { type: "stale", tokenId, reason },
      })),
      notifications: [
        ...stale.map(({ id, fromUserId, tokenId }): TradeNotification => ({
          type: "offer_stale",
          userId: fromUserId,
          offerId: id,
          actorId: null,
          tokenId,
        })),
        ...listings.flatMap(({ id, fromUserId }): TradeNotification[] => {
          const broke = breaks.get(id);
          return broke === undefined
            ? []
            : [
                {
                  type: "listing_closed",
                  userId: fromUserId,
                  offerId: id,
                  actorId: null,
                  tokenId: broke.tokenId,
                },
              ];
        }),
      ],
      listings: listings.length,
    };
  });

/**
 * A cursor past the outbox's newest row skips every row until the outbox
 * catches up, which happens when the indexer DB is restored or replaced.
 */
const warnIfCursorAhead = (seq: bigint) =>
  Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;
    const [outbox] = yield* indexer
      .select({ maxId: max(listEventOutbox.id) })
      .from(listEventOutbox);
    const maxId = outbox?.maxId;
    if (maxId !== null && maxId !== undefined && seq > maxId) {
      yield* Effect.logWarning(
        `Drain cursor ${seq} is past the outbox's max id ${maxId}; rows up to ${seq} will be skipped`,
      );
    }
  });

/**
 * Delete outbox rows that are BOTH older than 7 days AND already past the
 * applied seq. Gating on the applied seq prevents events from being purged
 * before they've been applied, which would otherwise cause permanent drift
 * if the drain is down for longer than the retention window.
 */
const purgeOutbox = (appliedSeq: bigint) =>
  Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;
    return yield* indexer
      .delete(listEventOutbox)
      .where(
        and(
          lt(listEventOutbox.createdAt, sql<string>`now() - interval '7 days'`),
          lte(listEventOutbox.id, appliedSeq),
        ),
      );
  });
