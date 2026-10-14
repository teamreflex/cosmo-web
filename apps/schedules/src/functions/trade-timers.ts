import {
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
import { DatabaseWeb } from "@apollo/services/database-web";
import { transition } from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME } from "@apollo/trades/timers";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

// how far the watermark may trail the clock before the drain looks stuck
const MAX_WATERMARK_LAG = 10 * 60 * 1000;

const BATCH_SIZE = 100;

/**
 * End the accepted trades whose deadline the drain's chain-time watermark
 * has passed, never the clock, timing each out or completing it. Runs every
 * minute so a trade ends within a minute of the watermark reaching its
 * deadline. The locking is explained in apps/schedules/CLAUDE.md.
 */
export const tradeTimersTask = {
  name: "trade-timers",
  cron: "*/1 * * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseWeb;

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
          return { chainTime, lag, tradeIds: [], completed: 0, timedOut: 0 };
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
        for (const trade of trades) {
          const result = transition(trade.state, { type: "time_out" });
          if (!result.ok) {
            return yield* Effect.die(
              `time out refused on trade ${trade.id}: ${result.reason}`,
            );
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
          timedOut: trades.length - completed,
        };
      }),
    );
    if (result === undefined) return;

    yield* publishTradeUpdates(result.tradeIds);
    yield* Effect.logInfo(
      `Timed out ${result.timedOut} trades and completed ${result.completed} at watermark ${result.chainTime.toISOString()} (${Math.round(result.lag / 1000)}s behind the clock)`,
    );
  }),
} satisfies ScheduledTask;
