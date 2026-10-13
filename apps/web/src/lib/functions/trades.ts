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
import { storedObjektItemSchema } from "@/lib/universal/trade-listings";
import type {
  MyTradeSide,
  MyTradesPage,
  TradeView,
  TradeViewer,
} from "@/lib/universal/trades";
import { can, parseRole } from "@apollo/auth";
import { tradeOffers } from "@apollo/database/web/schema";
import { liveTradeStatuses, type TradeSide } from "@apollo/database/web/types";
import { needsYou, partyAction, tradeState } from "@apollo/trades/lifecycle";
import { addr } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

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
      const staff = can(parseRole(role), { trade: ["read-any"] });
      const read = await readTradeView(data.tradeId);
      if (read === null) return null;
      const { trade } = read;

      const side =
        trade.parties.from.user?.id === userId
          ? "from"
          : trade.parties.to.user?.id === userId
            ? "to"
            : null;
      if (side !== null) return { trade, viewer: { kind: "party", side } };
      return staff
        ? {
            trade,
            viewer: { kind: "staff", report: read.disputeReport },
          }
        : null;
    },
  );

const FINISHED_PAGE_SIZE = 30;

/**
 * The caller's trades for My trades: every live one by deadline, or the
 * ended ones newest first, keyset-paged on the trade id like the Listings
 * feed. Each side lists every objekt it sends, as the feed shows a
 * listing's offered side.
 */
export const $fetchMyTrades = createServerFn({ method: "GET" })
  .validator(myTradesInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<MyTradesPage> => {
    const userId = context.session.user.id;
    const { cursor } = data;
    const active = data.tab === "active";
    const cursorRow = alias(tradeOffers, "cursor_row");
    const pageQuery = db
      .select({ id: tradeOffers.id })
      .from(tradeOffers)
      .where(
        and(
          eq(tradeOffers.kind, "trade"),
          or(
            eq(tradeOffers.fromUserId, userId),
            eq(tradeOffers.toUserId, userId),
          ),
          active
            ? inArray(tradeOffers.status, [...liveTradeStatuses])
            : inArray(tradeOffers.status, [
                "completed",
                "cancelled",
                "timed_out",
              ]),
          !active && cursor !== undefined
            ? sql`(${tradeOffers.endedAt}, ${tradeOffers.id}) < (${db
                .select({ endedAt: cursorRow.endedAt, id: cursorRow.id })
                .from(cursorRow)
                .where(eq(cursorRow.id, cursor))})`
            : undefined,
        ),
      )
      .orderBy(
        ...(active
          ? [asc(tradeOffers.deadlineAt), asc(tradeOffers.id)]
          : [desc(tradeOffers.endedAt), desc(tradeOffers.id)]),
      )
      .$dynamic();
    const rows = await db.query.tradeOffers.findMany({
      where: {
        RAW: (t) =>
          inArray(
            t.id,
            active ? pageQuery : pageQuery.limit(FINISHED_PAGE_SIZE + 1),
          ),
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
        items: { orderBy: { id: "asc" } },
        // the dispute that froze a disputed trade
        messages: {
          where: {
            kind: "event",
            RAW: (t) => sql`${t.event}->>'type' = 'disputed'`,
          },
          columns: { createdAt: true, event: true },
          orderBy: { id: "desc" },
          limit: 1,
        },
        fromUser: true,
        toUser: true,
        fromCosmo: { columns: { username: true } },
        toCosmo: { columns: { username: true } },
      },
      orderBy: active
        ? { deadlineAt: "asc", id: "asc" }
        : { endedAt: "desc", id: "desc" },
    });
    const page = active ? rows : rows.slice(0, FINISHED_PAGE_SIZE);
    const trades = page.map((row) => {
      const side: TradeSide = row.fromUserId === userId ? "from" : "to";
      // payments arrive with phase 12a; every item so far is an objekt
      const objekts = row.items.flatMap((item) =>
        item.kind === "objekt"
          ? [{ item, ...storedObjektItemSchema.parse(item) }]
          : [],
      );
      return {
        row,
        side,
        send: objekts.filter(({ item }) => item.sender === side),
        get: objekts.filter(({ item }) => item.sender !== side),
      };
    });
    const objekts = trades.flatMap(({ send, get }) => [...send, ...get]);
    const indexed = await readIndexed(
      [...new Set(objekts.map(({ attributes }) => attributes.slug))],
      objekts.map(({ tokenId }) => tokenId),
    );

    const summary = (items: typeof objekts): MyTradeSide => ({
      items: items.map(({ tokenId, attributes }) => {
        const token = indexed.states.get(tokenId);
        return {
          tokenId,
          attributes,
          serial: token?.kind === "found" ? token.serial : null,
          collection: indexed.collections.get(attributes.slug) ?? null,
        };
      }),
      sent: items.filter(({ item }) => item.transferredAt !== null).length,
    });

    const mapped = trades.map(({ row, side, send, get }) => {
      if (row.deadlineAt === null) {
        throw new Error("accepted trade without a deadline");
      }
      const state = tradeState(row, row.items);
      const [dispute] = row.messages;
      const other =
        side === "from"
          ? { id: row.toUserId, user: row.toUser, cosmo: row.toCosmo }
          : { id: row.fromUserId, user: row.fromUser, cosmo: row.fromCosmo };
      return {
        id: row.id,
        side,
        state,
        deadlineAt: row.deadlineAt,
        pause:
          state.status === "disputed" && dispute?.event?.type === "disputed"
            ? { at: dispute.createdAt, by: dispute.event.by }
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
    return {
      rows: mapped,
      nextCursor: rows.length > page.length ? page.at(-1)?.id : undefined,
    };
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
    // read before the transaction, so it never holds a connection on the indexer
    const tokens = await readIndexerTokens(parties.tokenIds);
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
      const result = partyAction(
        trade.state,
        { type: "cancel", by },
        {
          deadlinePassed: await isDue(tx, trade),
          arrived: unsent.some(({ tokenId, receiver }) => {
            const state = tokens.get(tokenId);
            return (
              state?.kind === "found" &&
              receiver !== null &&
              state.owner === addr(receiver)
            );
          }),
        },
      );
      if (!result.ok) refuseTrade(partyRefusals[result.reason]);

      await endTrade(tx, trade, result.trade, users, tokens);
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
