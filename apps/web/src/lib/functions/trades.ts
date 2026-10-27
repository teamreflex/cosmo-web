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
  watermarkExtra,
} from "@/lib/server/trades/trade-view.server";
import {
  disputeTrade,
  endTrade,
  insertTradeEvent,
  isDue,
  lockPartyTrade,
  notifyUsers,
  partyRefusals,
  partyTrade,
  refuseTrade,
} from "@/lib/server/trades/trade.server";
import {
  myTradesInputSchema,
  openDisputeInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import { storedObjektItemSchema } from "@/lib/universal/trade-listings";
import {
  type MyTradeSide,
  type MyTradesPage,
  offerCloser,
  type TradeView,
  type TradeViewer,
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
  openTradeStatuses,
  type TradeSide,
} from "@apollo/database/web/types";
import {
  needsYou,
  partyAction,
  tradeListingId,
  tradeState,
} from "@apollo/trades/lifecycle";
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

/**
 * A trade the caller is part of, with their side, or for staff who may read
 * any trade, the trade with its dispute report. Anyone else gets null, so a
 * trade's existence never leaks. Direct offers show from the moment they're
 * sent.
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
 * The caller's trades for My trades: the live ones and pending offers by
 * when they're due, or the ended ones newest first, keyset-paged after the
 * previous page's last trade. Each side lists every objekt it sends, as
 * the feed shows a listing's offered side.
 */
export const $fetchMyTrades = createServerFn({ method: "GET" })
  .validator(myTradesInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<MyTradesPage> => {
    const userId = context.session.user.id;
    const active = data.tab === "active";

    // when a live trade or a pending offer is due, or when a finished one ended
    const sortedBy = (t: {
      deadlineAt: SQLWrapper;
      expiresAt: SQLWrapper;
      endedAt: SQLWrapper;
    }) =>
      active
        ? sql`coalesce(${t.deadlineAt}, ${t.expiresAt})`
        : sql`${t.endedAt}`;

    // the trade id breaks ties
    const order = (t: {
      deadlineAt: SQLWrapper;
      expiresAt: SQLWrapper;
      endedAt: SQLWrapper;
      id: SQLWrapper;
    }) =>
      active ? [asc(sortedBy(t)), asc(t.id)] : [desc(sortedBy(t)), desc(t.id)];

    // switch operator depending on tab
    const past = active ? gt : lt;

    const mine = db
      .select({
        id: tradeOffers.id,
        status: tradeOffers.status,
        fromUserId: tradeOffers.fromUserId,
        cancelledBy: tradeOffers.cancelledBy,
        proposedBy: tradeOffers.proposedBy,
        deadlineAt: tradeOffers.deadlineAt,
        expiresAt: tradeOffers.expiresAt,
        endedAt: tradeOffers.endedAt,
        // the sort value as exact text for the next cursor, since a Date drops the microseconds
        cursorAt:
          sql<string>`to_char(${sortedBy(tradeOffers)} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.as(
            "cursor_at",
          ),
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
          // a countered offer is left out, since its counter is a row of its own
          inArray(
            tradeOffers.status,
            active
              ? [...openTradeStatuses]
              : [
                  ...endedTradeStatuses,
                  "declined",
                  "withdrawn",
                  "expired",
                  "stale",
                ],
          ),
          // a page continues after the previous page's last trade, as it sorted then
          data.cursor === undefined
            ? undefined
            : or(
                past(
                  sortedBy(tradeOffers),
                  sql`${data.cursor.at}::timestamptz`,
                ),
                and(
                  eq(
                    sortedBy(tradeOffers),
                    sql`${data.cursor.at}::timestamptz`,
                  ),
                  past(tradeOffers.id, data.cursor.id),
                ),
              ),
        ),
      )
      .orderBy(...order(tradeOffers))
      .limit(PAGE_SIZE + 1);

    const page = db.$with("page").as(mine);

    // the event that froze a disputed trade, or that closed an offer
    const halt = db
      .select({
        createdAt: tradeMessages.createdAt,
        event: tradeMessages.event,
      })
      .from(tradeMessages)
      .where(
        and(
          eq(tradeMessages.tradeId, page.id),
          eq(tradeMessages.kind, "event"),
          sql`${tradeMessages.event}->>'type' in ('disputed', 'declined', 'withdrawn')`,
        ),
      )
      .orderBy(desc(tradeMessages.id))
      .limit(1)
      .as("halt");

    // one row per item, in page order
    const rows = await db
      .with(page)
      .select({
        trade: {
          id: page.id,
          status: page.status,
          fromUserId: page.fromUserId,
          cancelledBy: page.cancelledBy,
          proposedBy: page.proposedBy,
          deadlineAt: page.deadlineAt,
          expiresAt: page.expiresAt,
          endedAt: page.endedAt,
          cursorAt: page.cursorAt,
          counterpartyId: page.counterpartyId,
        },
        item: tradeOfferItems,
        counterparty: user,
        cosmo: { username: cosmoAccounts.username },
        halt: { createdAt: halt.createdAt, event: halt.event },
        watermark: watermarkExtra(),
      })
      .from(page)
      .innerJoin(tradeOfferItems, eq(tradeOfferItems.offerId, page.id))
      .leftJoin(user, eq(user.id, page.counterpartyId))
      .leftJoin(
        cosmoAccounts,
        eq(cosmoAccounts.address, page.counterpartyAddress),
      )
      .leftJoinLateral(halt, sql`true`)
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
      // a trade has a deadline once accepted, and an offer expires until then
      const dueAt = trade.deadlineAt ?? trade.expiresAt;
      if (dueAt === null) {
        throw new Error("trade without a deadline or an expiry");
      }
      const state = tradeState(trade, items);
      return {
        id: trade.id,
        state,
        dueAt,
        dispute: tradeDispute(state, row.halt === null ? [] : [row.halt]),
        closer: offerCloser(row.halt?.event ?? null),
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
          deadlinePassed: deadlinePassed(state, dueAt, row.watermark),
        }),
      };
    });

    const last = pageTrades.at(-1)?.row.trade;
    return {
      rows: mapped,
      nextCursor:
        all.length > pageTrades.length && last !== undefined
          ? { at: last.cursorAt, id: last.id }
          : undefined,
    };
  });

/**
 * Cancel an accepted trade the caller is part of, while nothing has been
 * sent or marked paid and its deadline hasn't passed the drain's watermark.
 * A token already in its receiver's account counts as sent before the
 * drain records it. The poster's objekts are free in the listing's pool
 * again, and the other party is notified.
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
                status: trade.state.status,
                fromAddress: trade.fromAddress,
                toAddress: trade.toAddress,
              }) === "arrived"
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
