import { db } from "@/lib/server/db";
import { alertDispute } from "@/lib/server/discord.server";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import {
  foldTradeItems,
  readIndexed,
  tradeSideSummary,
} from "@/lib/server/trades/feed.server";
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
  confirmPaymentInputSchema,
  markPaidInputSchema,
  myTradesInputSchema,
  openDisputeInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import {
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
  nextStep,
  otherSide,
  partyAction,
  tradeListingId,
  tradeParts,
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

    // drop the lookahead trade and gather each trade's objekts and payment
    const { trades, hasMore } = foldTradeItems(rows, PAGE_SIZE);

    // fetch collections from the indexer
    const pageObjekts = trades.flatMap(({ objekts }) => objekts);
    const indexed = await readIndexed(
      [...new Set(pageObjekts.map(({ attributes }) => attributes.slug))],
      pageObjekts.map(({ tokenId }) => tokenId),
    );

    // each trade as a My trades row from the caller's side
    const mapped = trades.map(({ row, items, objekts, payment }) => {
      const { trade } = row;
      const side: TradeSide = trade.fromUserId === userId ? "from" : "to";
      // a trade has a deadline once accepted, and an offer expires until then
      const dueAt = trade.deadlineAt ?? trade.expiresAt;
      if (dueAt === null) {
        throw new Error("trade without a deadline or an expiry");
      }
      const state = tradeState(trade, items);
      const parts = tradeParts(items);
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
        send: tradeSideSummary(side, objekts, parts, payment, indexed),
        get: tradeSideSummary(
          otherSide(side),
          objekts,
          parts,
          payment,
          indexed,
        ),
        nextStep: nextStep(state, side, {
          deadlinePassed: deadlinePassed(state, dueAt, row.watermark),
        }),
      };
    });

    const last = trades.at(-1)?.row.trade;
    return {
      rows: mapped,
      nextCursor:
        hasMore && last !== undefined
          ? { at: last.cursorAt, id: last.id }
          : undefined,
    };
  });

/**
 * Cancel an accepted trade the caller is part of, while nothing has been
 * sent or confirmed and its deadline hasn't passed the drain's watermark.
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
      if (!result.ok) {
        // a payment marked paid or confirmed starts a trade too, which a payment trade's refusal says
        refuseTrade(
          result.reason === "already_started" &&
            trade.items.some((item) => item.kind === "payment")
            ? "trade_cancel_started_payment"
            : partyRefusals[result.reason],
        );
      }

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
    const dispute = await db.transaction(async (tx) => {
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

      const reportId = await disputeTrade(
        tx,
        trade,
        users.filter((row) => row.id !== userId),
        { by, reporterId: userId, reason: data.reason, note: data.note },
      );
      return { reportId, by };
    });
    await Promise.all([
      publishTradeUpdates([data.tradeId]),
      alertDispute({
        reportId: dispute.reportId,
        tradeId: data.tradeId,
        reason: data.reason,
        note: data.note ?? null,
        openedBy: dispute.by,
        fromUserId: parties.fromUserId,
        toUserId: parties.toUserId,
      }),
    ]);
  });

/**
 * The sender of a trade's payment says they paid it, under the same gate as
 * a confirmation: an accepted trade before its deadline passes the drain's
 * watermark, or a disputed one. It only records the mark and its timeline
 * event: it settles nothing, notifies no one, and changes nothing a cancel
 * or completion goes by. Only the deadline counts it, disputing a trade
 * whose payment was marked paid rather than timing it out. A payment
 * marks paid once, and not once its recipient confirmed it.
 */
export const $markPaid = createServerFn({ method: "POST" })
  .validator(markPaidInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await consumeRateLimit({
      key: `trade-mark-paid:${userId}`,
      limit: 10,
      window: "10 minutes",
    });

    const parties = await partyTrade(userId, data.tradeId);
    await db.transaction(async (tx) => {
      const { trade, by } = await lockPartyTrade(
        tx,
        userId,
        data.tradeId,
        parties,
      );

      const result = partyAction(
        trade.state,
        {
          type: "mark_paid",
          item: trade.items.findIndex(({ id }) => id === data.itemId),
          by,
        },
        {
          deadlinePassed:
            trade.state.status === "accepted" && (await isDue(tx, trade)),
          arrived: false,
        },
      );
      if (!result.ok) refuseTrade(partyRefusals[result.reason]);

      await tx
        .update(tradeOfferItems)
        .set({ markedPaidAt: sql`now()` })
        .where(eq(tradeOfferItems.id, data.itemId));
      await insertTradeEvent(tx, trade.id, {
        type: "marked_paid",
        itemId: data.itemId,
      });
    });
    await publishTradeUpdates([data.tradeId]);
  });

/**
 * The recipient of a trade's payment says it arrived, and by which of the methods the trade took from its listing when claimed. Only the recipient can, never its sender, and only before the deadline passes the drain's watermark, as a cancel; a disputed trade's clock is stopped, so staff see a confirmation that came late. When it settles the trade, the trade completes here, as the drain completes one when the last token arrives, and both parties hear of it. A confirmation that leaves something owed notifies no one.
 */
export const $confirmPayment = createServerFn({ method: "POST" })
  .validator(confirmPaymentInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await consumeRateLimit({
      key: `trade-confirm-payment:${userId}`,
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

      const item = trade.items.findIndex(({ id }) => id === data.itemId);
      const result = partyAction(
        trade.state,
        { type: "confirm_payment", item, by },
        {
          deadlinePassed:
            trade.state.status === "accepted" && (await isDue(tx, trade)),
          arrived: false,
        },
      );
      if (!result.ok) refuseTrade(partyRefusals[result.reason]);
      if (!trade.paymentMethods.includes(data.method)) {
        refuseTrade("payment_method_unaccepted");
      }

      await tx
        .update(tradeOfferItems)
        .set({ confirmedAt: sql`now()`, method: data.method })
        .where(eq(tradeOfferItems.id, data.itemId));
      await insertTradeEvent(tx, trade.id, {
        type: "payment_confirmed",
        itemId: data.itemId,
        method: data.method,
      });
      if (result.trade.status === "completed") {
        await endTrade(tx, trade, result.trade, users);
        await insertTradeEvent(tx, trade.id, { type: "completed", by: null });
        await notifyUsers(tx, users, {
          type: "trade_completed",
          offerId: trade.id,
          actorId: null,
          tokenId: null,
        });
      }
    });
    await publishTradeUpdates([data.tradeId]);
  });
