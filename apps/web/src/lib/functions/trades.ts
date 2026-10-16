import { db } from "@/lib/server/db";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { feedItem, readIndexed } from "@/lib/server/trades/feed.server";
import { readIndexerTokens } from "@/lib/server/trades/holdings.server";
import {
  deadlinePassed,
  readTradeView,
  toPartyName,
  tradeDispute,
  tradeListingId,
  watermarkExtra,
} from "@/lib/server/trades/trade-view.server";
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
import {
  cosmoAccounts,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  user,
} from "@apollo/database/web/schema";
import {
  endedTradeStatuses,
  liveTradeStatuses,
  type TradeSide,
} from "@apollo/database/web/types";
import { needsYou, partyAction, tradeState } from "@apollo/trades/lifecycle";
import { itemStatus } from "@apollo/trades/transfers";
import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  lt,
  or,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";

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
      const read = await readTradeView(data.tradeId, { kind: "user", userId });
      if (read === null) return null;
      const { trade, viewer } = read;

      if (viewer.kind === "party") {
        return { trade, viewer };
      }
      return can(parseRole(role), { trade: ["read-any"] })
        ? {
            trade,
            viewer: { kind: "staff", report: read.disputeReport },
          }
        : null;
    },
  );

const PAGE_SIZE = 30;

/**
 * The caller's trades for My trades: the live ones by deadline, or the
 * ended ones newest first, keyset-paged after the previous page's last
 * trade. Each side lists every objekt it sends, as the feed shows a
 * listing's offered side.
 */
export const $fetchMyTrades = createServerFn({ method: "GET" })
  .validator(myTradesInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<MyTradesPage> => {
    const userId = context.session.user.id;
    const active = data.tab === "active";
    const order = (t: {
      deadlineAt: SQLWrapper;
      endedAt: SQLWrapper;
      id: SQLWrapper;
    }) =>
      active ? [asc(t.deadlineAt), asc(t.id)] : [desc(t.endedAt), desc(t.id)];

    const cursorRow = alias(tradeOffers, "cursor_row");

    // the tab's sort column; the trade id breaks ties
    const sortedBy = (t: { deadlineAt: AnyPgColumn; endedAt: AnyPgColumn }) =>
      active ? t.deadlineAt : t.endedAt;

    // switch operator depending on tab
    const past = active ? gt : lt;

    const cursorAt = (cursor: string) =>
      db
        .select({ at: sortedBy(cursorRow) })
        .from(cursorRow)
        .where(eq(cursorRow.id, cursor));

    const mine = db
      .select({
        id: tradeOffers.id,
        status: tradeOffers.status,
        fromUserId: tradeOffers.fromUserId,
        cancelledBy: tradeOffers.cancelledBy,
        abandonedBy: tradeOffers.abandonedBy,
        deadlineAt: tradeOffers.deadlineAt,
        endedAt: tradeOffers.endedAt,
        // the other party, and the address their side is pinned to
        counterpartyId: sql<
          string | null
        >`case when ${tradeOffers.fromUserId} = ${userId} then ${tradeOffers.toUserId} else ${tradeOffers.fromUserId} end`.as(
          "counterparty_id",
        ),
        counterpartyAddress: sql<
          string | null
        >`case when ${tradeOffers.fromUserId} = ${userId} then ${tradeOffers.toAddress} else ${tradeOffers.fromAddress} end`.as(
          "counterparty_address",
        ),
      })
      .from(tradeOffers)
      .where(
        and(
          eq(tradeOffers.kind, "trade"),
          or(
            eq(tradeOffers.fromUserId, userId),
            eq(tradeOffers.toUserId, userId),
          ),
          inArray(
            tradeOffers.status,
            active ? [...liveTradeStatuses] : [...endedTradeStatuses],
          ),
          // a page continues after the previous page's last trade
          data.cursor === undefined
            ? undefined
            : or(
                past(sortedBy(tradeOffers), cursorAt(data.cursor)),
                and(
                  eq(sortedBy(tradeOffers), cursorAt(data.cursor)),
                  past(tradeOffers.id, data.cursor),
                ),
              ),
        ),
      )
      .orderBy(...order(tradeOffers))
      .limit(PAGE_SIZE + 1);

    const page = db.$with("page").as(mine);

    // the event that froze a disputed trade
    const dispute = db
      .select({
        createdAt: tradeMessages.createdAt,
        event: tradeMessages.event,
      })
      .from(tradeMessages)
      .where(
        and(
          eq(tradeMessages.tradeId, page.id),
          eq(tradeMessages.kind, "event"),
          sql`${tradeMessages.event}->>'type' = 'disputed'`,
        ),
      )
      .orderBy(desc(tradeMessages.id))
      .limit(1)
      .as("dispute");

    // one row per item, in page order
    const rows = await db
      .with(page)
      .select({
        trade: {
          id: page.id,
          status: page.status,
          fromUserId: page.fromUserId,
          cancelledBy: page.cancelledBy,
          abandonedBy: page.abandonedBy,
          deadlineAt: page.deadlineAt,
          endedAt: page.endedAt,
          counterpartyId: page.counterpartyId,
        },
        item: tradeOfferItems,
        counterparty: user,
        cosmo: { username: cosmoAccounts.username },
        dispute: { createdAt: dispute.createdAt, event: dispute.event },
        watermark: watermarkExtra(),
      })
      .from(page)
      .innerJoin(tradeOfferItems, eq(tradeOfferItems.offerId, page.id))
      .leftJoin(user, eq(user.id, page.counterpartyId))
      .leftJoin(
        cosmoAccounts,
        eq(cosmoAccounts.address, page.counterpartyAddress),
      )
      .leftJoinLateral(dispute, sql`true`)
      .orderBy(...order(page), asc(tradeOfferItems.id));

    type Row = (typeof rows)[number];
    const grouped = new Map<string, { row: Row; items: Row["item"][] }>();

    // fold the item rows back into one entry per trade, in page order
    for (const row of rows) {
      const trade = grouped.get(row.trade.id);
      if (trade === undefined) {
        grouped.set(row.trade.id, { row, items: [row.item] });
      } else {
        trade.items.push(row.item);
      }
    }

    // drop the lookahead trade and split each trade's objekts by who sends them
    const all = [...grouped.values()];
    const pageTrades = all.slice(0, PAGE_SIZE);
    const trades = pageTrades.map(({ row, items }) => {
      const side: TradeSide = row.trade.fromUserId === userId ? "from" : "to";
      // payments arrive with phase 13a; every item so far is an objekt
      const objekts = items.flatMap((item) =>
        item.kind === "objekt"
          ? [{ item, ...storedObjektItemSchema.parse(item) }]
          : [],
      );
      return {
        row,
        items,
        side,
        send: objekts.filter(({ item }) => item.sender === side),
        get: objekts.filter(({ item }) => item.sender !== side),
      };
    });

    // fetch collections from the indexer
    const objekts = trades.flatMap(({ send, get }) => [...send, ...get]);
    const indexed = await readIndexed(
      [...new Set(objekts.map(({ attributes }) => attributes.slug))],
      objekts.map(({ tokenId }) => tokenId),
    );

    // one side of a row: its objekts as feed items and how many have arrived
    const summary = (items: typeof objekts): MyTradeSide => ({
      items: items.map((item) => feedItem(item, indexed)),
      sent: items.filter(({ item }) => item.transferredAt !== null).length,
    });

    // each trade as a My trades row from the caller's side
    const mapped = trades.map(({ row, items, side, send, get }) => {
      const { trade } = row;
      if (trade.deadlineAt === null) {
        throw new Error("accepted trade without a deadline");
      }
      const state = tradeState(trade, items);
      return {
        id: trade.id,
        state,
        deadlineAt: trade.deadlineAt,
        dispute: tradeDispute(state, row.dispute === null ? [] : [row.dispute]),
        endedAt: trade.endedAt,
        listingId: tradeListingId(items),
        counterparty: toPartyName(
          trade.counterpartyId,
          row.counterparty,
          row.cosmo,
        ),
        send: summary(send),
        get: summary(get),
        needsYou: needsYou(state, side, {
          deadlinePassed: deadlinePassed(
            state,
            trade.deadlineAt,
            row.watermark,
          ),
        }),
      };
    });

    return {
      rows: mapped,
      nextCursor:
        all.length > pageTrades.length
          ? pageTrades.at(-1)?.row.trade.id
          : undefined,
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

      const result = partyAction(
        trade.state,
        { type: "cancel", by },
        {
          deadlinePassed: await isDue(tx, trade),
          arrived: trade.items.some((item) => {
            const token =
              item.tokenId === null ? undefined : tokens.get(item.tokenId);
            return (
              itemStatus(item, token?.kind === "found" ? token : undefined, {
                live: true,
                fromAddress: trade.fromAddress,
                toAddress: trade.toAddress,
              }) === "arrived"
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
