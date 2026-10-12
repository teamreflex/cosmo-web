import { DatabaseWeb } from "@/db";
import {
  endTrade,
  insertTradeEvents,
  insertTradeNotifications,
  lockLiveTrades,
  lockUsers,
  publishTradeUpdates,
  type TradeNotification,
} from "@/trades";
import {
  listDrainCursor,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import { transition } from "@apollo/trades/lifecycle";
import { DRAIN_CURSOR_NAME } from "@apollo/trades/timers";
import { and, asc, eq, lte, not, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { ScheduledTask } from "../task";

// how far the watermark may trail the clock before the drain looks stuck
const MAX_WATERMARK_LAG = 10 * 60 * 1000;

const BATCH_SIZE = 100;

/**
 * Either party has an active ban: isBanActive in @apollo/auth/guard, which
 * this app doesn't depend on. Their trades wait for staff, since the ban
 * disputes them.
 */
const partyBanned = sql`exists (select 1 from ${user} where ${user.id} in (${tradeOffers.fromUserId}, ${tradeOffers.toUserId}) and ${user.banned} and (${user.banExpires} is null or ${user.banExpires} > now()))`;

/**
 * End the accepted trades whose deadline the drain's chain-time watermark
 * has passed, never the clock, so a transfer stamped before the deadline but
 * drained after it still counts. Each times out with every side still owing
 * marked abandoned, or completes when only a payment confirmation is missing.
 * Trades with a banned party are skipped: the ban disputes them, and until a
 * failed ban sweep is re-run they wait for staff. Runs every minute so a
 * trade ends within a minute of the watermark reaching its deadline, and
 * logs an error when the watermark trails the clock by more than 10 minutes.
 *
 * Locks the cursor `FOR SHARE` first, so a drain batch (which holds it
 * `FOR UPDATE`) commits its transfers before the deadline is judged, then
 * the parties and the trades in id order (docs/auth.md). The parties are
 * locked `FOR SHARE`, which a ban's update of the user row waits for: the
 * banned-party recheck reads under the trade lock statement's snapshot,
 * taken before any wait for the trade, so a ban committing during that wait
 * would go unseen.
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
              not(partyBanned),
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
          "share",
        );
        const trades = yield* lockLiveTrades(
          tx,
          due.map((trade) => trade.id),
          and(
            eq(tradeOffers.status, "accepted"),
            lte(tradeOffers.deadlineAt, chainTime),
            not(partyBanned),
          ),
        );

        const notifications: TradeNotification[] = [];
        let completed = 0;
        for (const trade of trades) {
          const result = transition(trade.state, { type: "time_out" });
          if (!result.ok) {
            return yield* Effect.die(
              `time out refused on trade ${trade.id}: ${result.reason}`,
            );
          }
          const next = result.trade;
          yield* endTrade(tx, trade, next);
          if (next.status === "completed") completed++;
          yield* insertTradeEvents(tx, trade.id, [
            next.status === "timed_out"
              ? { type: "timed_out", abandoned: next.abandonedBy }
              : { type: "completed", by: null },
          ]);
          for (const userId of [trade.fromUserId, trade.toUserId]) {
            notifications.push({
              type:
                next.status === "timed_out"
                  ? "trade_timed_out"
                  : "trade_completed",
              userId,
              offerId: trade.id,
              actorId: null,
              tokenId: null,
            });
          }
        }
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
