import { db, type WebTx } from "@/lib/server/db";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { readIndexerTokens } from "@/lib/server/trades/holdings.server";
import { refusePoster } from "@/lib/server/trades/listings.server";
import {
  disputeTrade,
  endTrade,
  insertTradeEvent,
  type LockedTrade,
  lockParties,
  lockTrade,
  notifyUsers,
  readWatermark,
} from "@/lib/server/trades/trade.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import type { TradeErrorCode } from "@/lib/universal/errors/trades";
import {
  openDisputeInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import type { TradeSide } from "@apollo/database/web/types";
import { transition } from "@apollo/trades/lifecycle";
import { isTimedOut } from "@apollo/trades/timers";
import { addr } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

function refuse(code: TradeErrorCode): never {
  throw new ExpectedError(code);
}

/**
 * The trade's parties, read without a lock, when the caller is one of them.
 * Anything else, a listing included, is not found.
 */
async function partyTrade(userId: string, tradeId: string) {
  const trade = await db.query.tradeOffers.findFirst({
    where: {
      id: tradeId,
      kind: "trade",
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    columns: { fromUserId: true, toUserId: true },
  });
  if (!trade) refuse("trade_not_found");
  return trade;
}

/**
 * Locks a party action's users, then its trade, refusing a caller whose
 * account is gone or banned. The caller's side comes from the session.
 */
async function lockPartyTrade(
  tx: WebTx,
  userId: string,
  tradeId: string,
  parties: { fromUserId: string | null; toUserId: string | null },
) {
  const users = await lockParties(tx, [parties.fromUserId, parties.toUserId]);
  refusePoster(users.find((row) => row.id === userId));
  const trade = await lockTrade(tx, tradeId);
  const by: TradeSide = trade.fromUserId === userId ? "from" : "to";
  return { users, trade, by };
}

/**
 * Refuses a party action once the trade's deadline has passed the drain's
 * watermark, so a party can't dodge the timers' abandoned mark.
 */
async function refuseIfDue(tx: WebTx, trade: LockedTrade) {
  if (
    trade.deadlineAt !== null &&
    isTimedOut(trade.deadlineAt, await readWatermark(tx))
  ) {
    refuse("trade_deadline_passed");
  }
}

/**
 * Cancel an accepted trade the caller is part of, while nothing has been
 * sent or marked paid and its deadline hasn't passed the drain's watermark.
 * A token already in its receiver's account counts as sent before the
 * drain records it. The listing reopens if the poster can still offer it,
 * else it breaks, and the other party is notified.
 */
export const $cancelTrade = createServerFn({ method: "POST" })
  .validator(tradeIdInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await consumeRateLimit({
      key: `trade-cancel:${userId}`,
      limit: 10,
      window: "10 minutes",
    });

    const parties = await partyTrade(userId, data.tradeId);
    await db.transaction(async (tx) => {
      const { users, trade, by } = await lockPartyTrade(
        tx,
        userId,
        data.tradeId,
        parties,
      );

      const result = transition(trade.state, { type: "cancel", by });
      if (!result.ok && result.reason === "wrong_status") {
        refuse("trade_status_changed");
      }
      await refuseIfDue(tx, trade);
      if (!result.ok) refuse("trade_cancel_started");

      const unsent = trade.items.flatMap(
        ({ tokenId, sender, transferredAt }) =>
          tokenId === null || transferredAt !== null
            ? []
            : [
                {
                  tokenId,
                  receiver:
                    sender === "from" ? trade.toAddress : trade.fromAddress,
                },
              ],
      );
      const states = await readIndexerTokens(
        unsent.map((item) => item.tokenId),
      );
      if (
        unsent.some(({ tokenId, receiver }) => {
          const state = states.get(tokenId);
          return (
            state?.kind === "found" &&
            receiver !== null &&
            state.owner === addr(receiver)
          );
        })
      ) {
        refuse("trade_cancel_started");
      }

      await endTrade(
        tx,
        trade,
        result.trade,
        users.find((row) => row.id === trade.fromUserId),
      );
      await insertTradeEvent(tx, trade.id, { type: "cancelled", by });
      await notifyUsers(
        tx,
        users.filter((row) => row.id !== userId),
        {
          type: "trade_cancelled",
          offerId: trade.id,
          actorId: userId,
          tokenId: null,
        },
      );
    });
    await publishTradeUpdates([data.tradeId]);
  });

/**
 * Open a dispute on an accepted trade the caller is part of, before its
 * deadline passes the drain's watermark. It files a trade report for staff
 * and freezes the trade: the deadline stops counting, and only staff can
 * complete, cancel or extend it, while transfers still count. The other
 * party is notified.
 */
export const $openDispute = createServerFn({ method: "POST" })
  .validator(openDisputeInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await consumeRateLimit({
      key: `trade-dispute:${userId}`,
      limit: 5,
      window: "10 minutes",
    });

    const parties = await partyTrade(userId, data.tradeId);
    await db.transaction(async (tx) => {
      const { users, trade, by } = await lockPartyTrade(
        tx,
        userId,
        data.tradeId,
        parties,
      );

      if (!transition(trade.state, { type: "dispute", by }).ok) {
        refuse("trade_status_changed");
      }
      await refuseIfDue(tx, trade);

      const reportId = await disputeTrade(tx, trade, {
        reporterId: userId,
        reason: data.reason,
        note: data.note,
      });
      await insertTradeEvent(tx, trade.id, {
        type: "disputed",
        by,
        reportId,
        reason: data.reason,
      });
      await notifyUsers(
        tx,
        users.filter((row) => row.id !== userId),
        {
          type: "trade_disputed",
          offerId: trade.id,
          actorId: userId,
          tokenId: null,
        },
      );
    });
    await publishTradeUpdates([data.tradeId]);
  });
