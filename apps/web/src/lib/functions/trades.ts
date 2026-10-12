import { db } from "@/lib/server/db";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { readIndexerTokens } from "@/lib/server/trades/holdings.server";
import {
  disputeTrade,
  endTrade,
  insertTradeEvent,
  lockPartyTrade,
  notifyUsers,
  partyTrade,
  isDue,
  partyRefusals,
  refuseTrade,
} from "@/lib/server/trades/trade.server";
import {
  openDisputeInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import { partyAction } from "@apollo/trades/lifecycle";
import { addr } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";

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
      const result = partyAction(
        trade.state,
        { type: "cancel", by },
        {
          deadlinePassed: await isDue(tx, trade),
          arrived: unsent.some(({ tokenId, receiver }) => {
            const state = states.get(tokenId);
            return (
              state?.kind === "found" &&
              receiver !== null &&
              state.owner === addr(receiver)
            );
          }),
        },
      );
      if (!result.ok) refuseTrade(partyRefusals[result.reason]);

      await endTrade(tx, trade, result.trade, users);
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

      const result = partyAction(
        trade.state,
        { type: "dispute", by },
        { deadlinePassed: await isDue(tx, trade), arrived: false },
      );
      if (!result.ok) refuseTrade(partyRefusals[result.reason]);

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
