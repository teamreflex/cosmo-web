import { toPublicUser } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { readIndexed } from "@/lib/server/trades/feed.server";
import { readIndexerTokens } from "@/lib/server/trades/holdings.server";
import { readTradeView } from "@/lib/server/trades/trade-view.server";
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
  myTradesInputSchema,
  openDisputeInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import type {
  MyTradeRow,
  MyTradeSide,
  TradeView,
  TradeViewer,
} from "@/lib/universal/trades";
import { can, parseRole } from "@apollo/auth";
import { liveTradeStatuses, type TradeSide } from "@apollo/database/web/types";
import { needsYou, partyAction, tradeState } from "@apollo/trades/lifecycle";
import { addr } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { subDays } from "date-fns";
import { sql } from "drizzle-orm";

/**
 * A trade the caller is part of, with their side, or for staff who may read
 * any trade, the trade with its dispute report. Anyone else gets null, so a
 * trade's existence never leaks. Only accepted, disputed and ended trades
 * are shown.
 */
export const $fetchTrade = createServerFn({ method: "GET" })
  .validator(tradeIdInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(
    async ({
      data,
      context,
    }): Promise<{ trade: TradeView; viewer: TradeViewer } | null> => {
      const { id: userId, role } = context.session.user;
      const parties = await db.query.tradeOffers.findFirst({
        where: { id: data.tradeId, kind: "trade" },
        columns: { fromUserId: true, toUserId: true, disputeReportId: true },
      });
      if (!parties) return null;

      const side =
        parties.fromUserId === userId
          ? "from"
          : parties.toUserId === userId
            ? "to"
            : null;
      if (side === null && !can(parseRole(role), { trade: ["read-any"] })) {
        return null;
      }

      const [trade, report] = await Promise.all([
        readTradeView(data.tradeId),
        side === null && parties.disputeReportId !== null
          ? db.query.reports.findFirst({
              where: { id: parties.disputeReportId },
              columns: { id: true, status: true },
            })
          : undefined,
      ]);
      return (
        trade && {
          trade,
          viewer:
            side === null
              ? { kind: "staff", report: report ?? null }
              : { kind: "party", side },
        }
      );
    },
  );

/**
 * The caller's trades for My trades: the live ones by deadline, or those
 * that ended in the last 30 days, newest first. Each side shows only its
 * first objekt, so the indexer is read for those alone.
 */
export const $fetchMyTrades = createServerFn({ method: "GET" })
  .validator(myTradesInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<MyTradeRow[]> => {
    const userId = context.session.user.id;
    const rows = await db.query.tradeOffers.findMany({
      where: {
        kind: "trade",
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        ...(data.tab === "active"
          ? { status: { in: [...liveTradeStatuses] } }
          : {
              status: { in: ["completed", "cancelled", "timed_out"] },
              endedAt: { gt: subDays(new Date(), 30) },
            }),
      },
      columns: {
        id: true,
        status: true,
        fromUserId: true,
        toUserId: true,
        cancelledBy: true,
        abandonedBy: true,
        deadlineAt: true,
        endedAt: true,
      },
      with: {
        items: {
          columns: {
            kind: true,
            sender: true,
            tokenId: true,
            slug: true,
            listingId: true,
            transferredAt: true,
            markedPaidAt: true,
            confirmedAt: true,
          },
          orderBy: { id: "asc" },
        },
        // the dispute that froze a disputed trade
        messages: {
          where: {
            kind: "event",
            RAW: (t) => sql`${t.event}->>'type' = 'disputed'`,
          },
          columns: { createdAt: true },
          orderBy: { id: "desc" },
          limit: 1,
        },
        fromUser: true,
        toUser: true,
        fromCosmo: { columns: { username: true } },
        toCosmo: { columns: { username: true } },
      },
      orderBy:
        data.tab === "active"
          ? { deadlineAt: "asc", id: "asc" }
          : { endedAt: "desc", id: "desc" },
    });

    const trades = rows.map((row) => {
      const side: TradeSide = row.fromUserId === userId ? "from" : "to";
      return {
        row,
        side,
        send: row.items.filter((item) => item.sender === side),
        get: row.items.filter((item) => item.sender !== side),
      };
    });
    const firsts = trades.flatMap(({ send, get }) =>
      [send[0], get[0]].flatMap((item) => item ?? []),
    );
    const indexed = await readIndexed(
      [...new Set(firsts.flatMap((item) => item.slug ?? []))],
      firsts.flatMap((item) => item.tokenId ?? []),
    );

    const summary = (items: typeof firsts): MyTradeSide => {
      const [first] = items;
      const token =
        first === undefined || first.tokenId === null
          ? undefined
          : indexed.states.get(first.tokenId);
      return {
        first:
          first === undefined
            ? null
            : {
                slug: first.slug,
                serial: token?.kind === "found" ? token.serial : null,
                collection:
                  first.slug === null
                    ? null
                    : (indexed.collections.get(first.slug) ?? null),
              },
        count: items.length,
        sent: items.filter((item) => item.transferredAt !== null).length,
      };
    };

    return trades.map(({ row, side, send, get }) => {
      if (row.deadlineAt === null) {
        throw new Error("accepted trade without a deadline");
      }
      const state = tradeState(row, row.items);
      const other =
        side === "from"
          ? { id: row.toUserId, user: row.toUser, cosmo: row.toCosmo }
          : { id: row.fromUserId, user: row.fromUser, cosmo: row.fromCosmo };
      return {
        id: row.id,
        side,
        state,
        deadlineAt: row.deadlineAt,
        pausedAt:
          state.status === "disputed"
            ? (row.messages[0]?.createdAt ?? null)
            : null,
        endedAt: row.endedAt,
        listingId:
          row.items.find((item) => item.listingId !== null)?.listingId ?? null,
        // a deleted party's pinned address may since belong to someone else
        counterparty:
          other.id === null
            ? { user: null, cosmoUsername: null }
            : {
                user: other.user && toPublicUser(other.user),
                cosmoUsername: other.cosmo?.username ?? null,
              },
        send: summary(send),
        get: summary(get),
        needsYou: needsYou(state, side),
      };
    });
  });

/**
 * How many of the caller's accepted trades wait on them to send something,
 * for the count beside every link to My trades.
 */
export const $fetchTradesNeedingYou = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session.user.id;
    const rows = await db.query.tradeOffers.findMany({
      where: {
        kind: "trade",
        status: "accepted",
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      columns: {
        status: true,
        fromUserId: true,
        cancelledBy: true,
        abandonedBy: true,
      },
      with: {
        items: {
          columns: {
            kind: true,
            sender: true,
            transferredAt: true,
            markedPaidAt: true,
            confirmedAt: true,
          },
        },
      },
    });
    return rows.filter((row) =>
      needsYou(
        tradeState(row, row.items),
        row.fromUserId === userId ? "from" : "to",
      ),
    ).length;
  });

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

      await disputeTrade(
        tx,
        trade,
        users.filter((row) => row.id !== userId),
        { by, reporterId: userId, reason: data.reason, note: data.note },
      );
    });
    await publishTradeUpdates([data.tradeId]);
  });
