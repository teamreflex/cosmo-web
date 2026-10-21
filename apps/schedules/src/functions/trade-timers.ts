import {
  disputeAtDeadline,
  endTrade,
  insertTradeEvents,
  insertTradeNotifications,
  lockLiveTrades,
  lockUsers,
  publishTradeUpdates,
  readListingTokens,
  type TradeEventRow,
  type TradeNotification,
} from "@/trades";
import { listDrainCursor, tradeOffers } from "@apollo/database/web/schema";
import { bumpUpdatedAt } from "@apollo/database/web/sql";
import { DatabaseWeb } from "@apollo/services/database-web";
import { offerTransition, transition } from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME } from "@apollo/trades/timers";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

// how far the watermark may trail the clock before the drain looks stuck
const MAX_WATERMARK_LAG = 10 * 60 * 1000;

const BATCH_SIZE = 100;

/**
 * Expire the pending offers whose 72 hours have passed on the database's
 * clock, then end the accepted trades whose deadline the drain's chain-time
 * watermark has passed, never the clock, timing each out, completing it or,
 * with something sent and something still owed, disputing it for staff.
 * Runs every minute so an offer or trade ends within a minute of its time.
 * The locking is explained in apps/schedules/CLAUDE.md.
 */
export const tradeTimersTask = {
  name: "trade-timers",
  cron: "*/1 * * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseWeb;

    const expired = yield* db.transaction((tx) =>
      Effect.gen(function* () {
        // the literal kind and status let trade_offers_expiry_idx serve this
        const due = yield* tx
          .select({
            id: tradeOffers.id,
            fromUserId: tradeOffers.fromUserId,
            toUserId: tradeOffers.toUserId,
          })
          .from(tradeOffers)
          .where(
            and(
              sql`${tradeOffers.kind} = 'trade' AND ${tradeOffers.status} = 'pending'`,
              lte(tradeOffers.expiresAt, sql`now()`),
            ),
          )
          .orderBy(asc(tradeOffers.expiresAt), asc(tradeOffers.id))
          .limit(BATCH_SIZE);
        if (due.length === 0) return [];

        // users, then the offers in id order (docs/auth.md)
        const locked = yield* lockUsers(
          tx,
          due.flatMap((offer) => [offer.fromUserId, offer.toUserId]),
        );
        const ids = due.map((offer) => offer.id);
        yield* tx
          .select({ id: tradeOffers.id })
          .from(tradeOffers)
          .where(inArray(tradeOffers.id, ids))
          .orderBy(asc(tradeOffers.id))
          .for("no key update");

        // an offer accepted, answered or withdrawn since the scan is left alone
        const { from, to } = offerTransition("expire");
        const offers = yield* tx
          .update(tradeOffers)
          .set({
            status: to,
            endedAt: sql`now()`,
            updatedAt: bumpUpdatedAt,
          })
          .where(
            and(
              inArray(tradeOffers.id, ids),
              eq(tradeOffers.status, from),
              lte(tradeOffers.expiresAt, sql`now()`),
            ),
          )
          .returning({
            id: tradeOffers.id,
            fromUserId: tradeOffers.fromUserId,
          });

        // only the sender hears that their offer expired
        yield* insertTradeEvents(
          tx,
          offers.map(({ id }) => ({ tradeId: id, event: { type: "expired" } })),
        );
        yield* insertTradeNotifications(
          tx,
          locked,
          offers.map(({ id, fromUserId }): TradeNotification => ({
            type: "offer_expired",
            userId: fromUserId,
            offerId: id,
            actorId: null,
            tokenId: null,
          })),
        );
        return offers.map(({ id }) => id);
      }),
    );
    yield* publishTradeUpdates(expired);
    yield* Effect.logInfo(`Expired ${expired.length} pending offers`);

    const result = yield* db.transaction((tx) =>
      Effect.gen(function* () {
        const [cursor] = yield* tx
          .select({ chainTime: listDrainCursor.chainTime })
          .from(listDrainCursor)
          .where(eq(listDrainCursor.name, DRAIN_CURSOR_NAME))
          .for("share");
        const chainTime = cursor?.chainTime ?? null;
        if (chainTime === null) {
          yield* Effect.logError(
            "No drain watermark yet, so no trade can time out",
          );
          return undefined;
        }
        const lag = Date.now() - chainTime.getTime();
        if (lag > MAX_WATERMARK_LAG) {
          yield* Effect.logError(
            `Drain watermark ${chainTime.toISOString()} is ${Math.round(lag / 1000)}s behind the clock`,
          );
        }

        // the literal kind and status let trade_offers_deadline_idx serve this
        const due = yield* tx
          .select({
            id: tradeOffers.id,
            fromUserId: tradeOffers.fromUserId,
            toUserId: tradeOffers.toUserId,
          })
          .from(tradeOffers)
          .where(
            and(
              sql`${tradeOffers.kind} = 'trade' AND ${tradeOffers.status} = 'accepted'`,
              lte(tradeOffers.deadlineAt, chainTime),
            ),
          )
          .orderBy(asc(tradeOffers.deadlineAt), asc(tradeOffers.id))
          .limit(BATCH_SIZE);
        if (due.length === 0) {
          return {
            chainTime,
            lag,
            tradeIds: [],
            completed: 0,
            disputed: 0,
            timedOut: 0,
          };
        }

        const locked = yield* lockUsers(
          tx,
          due.flatMap((trade) => [trade.fromUserId, trade.toUserId]),
        );
        const trades = yield* lockLiveTrades(
          tx,
          due.map((trade) => trade.id),
          and(
            eq(tradeOffers.status, "accepted"),
            lte(tradeOffers.deadlineAt, chainTime),
          ),
        );

        const tokens = yield* readListingTokens(trades);

        const notifications: TradeNotification[] = [];
        const events: TradeEventRow[] = [];
        let completed = 0;
        let disputed = 0;
        for (const trade of trades) {
          const result = transition(trade.state, { type: "time_out" });
          if (!result.ok) {
            return yield* Effect.die(
              `time out refused on trade ${trade.id}: ${result.reason}`,
            );
          }
          if (result.trade.status === "disputed") {
            const frozen = yield* disputeAtDeadline(tx, trade);
            disputed++;
            events.push(frozen.event);
            notifications.push(...frozen.notifications);
            continue;
          }
          const ended = yield* endTrade(
            tx,
            trade,
            result.trade,
            locked,
            tokens,
          );
          if (result.trade.status === "completed") completed++;
          events.push(ended.event);
          notifications.push(...ended.notifications);
        }
        yield* insertTradeEvents(tx, events);
        yield* insertTradeNotifications(tx, locked, notifications);

        return {
          chainTime,
          lag,
          tradeIds: trades.map((trade) => trade.id),
          completed,
          disputed,
          timedOut: trades.length - completed - disputed,
        };
      }),
    );
    if (result === undefined) return;

    yield* publishTradeUpdates(result.tradeIds);
    yield* Effect.logInfo(
      `Timed out ${result.timedOut} trades, disputed ${result.disputed} and completed ${result.completed} at watermark ${result.chainTime.toISOString()} (${Math.round(result.lag / 1000)}s behind the clock)`,
    );
  }),
} satisfies ScheduledTask;
