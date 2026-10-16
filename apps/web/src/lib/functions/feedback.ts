import { db } from "@/lib/server/db";
import { addFeedbackStats, refuseFeedback } from "@/lib/server/feedback.server";
import {
  authenticatedMiddleware,
  staffMiddleware,
} from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { resolveTargetReports } from "@/lib/server/reports.server";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { toPartyName } from "@/lib/server/trades/trade-view.server";
import {
  insertTradeEvent,
  lockPartyTrade,
  notifyUsers,
  partyTrade,
  refuseTrade,
} from "@/lib/server/trades/trade.server";
import type {
  FeedbackEntriesPage,
  FeedbackSummary,
} from "@/lib/universal/feedback";
import {
  feedbackEntriesInputSchema,
  feedbackSummaryInputSchema,
  leaveFeedbackSchema,
  removeFeedbackSchema,
} from "@/lib/universal/schema/feedback";
import {
  tradeFeedback,
  tradeOfferItems,
  tradeOffers,
  userFeedbackStats,
} from "@apollo/database/web/schema";
import {
  averageStars,
  feedbackOpening,
  feedbackRole,
  feedbackScored,
  ratedRole,
} from "@apollo/trades/feedback";
import { otherSide } from "@apollo/trades/lifecycle";
import { createServerFn } from "@tanstack/react-start";
import {
  and,
  EmptyFilter,
  eq,
  isNotNull,
  isNull,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Rate the other party of a trade the caller is part of, once, while the
 * trade is eligible and its window is open. The rating shows straight away:
 * a scored one updates the rated address's stats, and the rated party is
 * notified, in the same transaction.
 */
export const $leaveFeedback = createServerFn({ method: "POST" })
  .validator(leaveFeedbackSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    await consumeRateLimit({
      key: `feedback:${userId}`,
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
      const other = otherSide(by);
      const counterpartId =
        other === "from" ? trade.fromUserId : trade.toUserId;
      const opening = feedbackOpening({
        state: trade.state,
        endedAt: trade.endedAt,
        now: trade.now,
        counterpartExists: users.some(({ id }) => id === counterpartId),
      });
      if (opening.status === "closed") {
        refuseFeedback("feedback_window_closed");
      }
      if (opening.status !== "open") refuseFeedback("feedback_not_eligible");
      if (trade.toAddress === null) {
        throw new Error("trade without a claimer address");
      }

      const addresses = { from: trade.fromAddress, to: trade.toAddress };
      const scored = feedbackScored(trade.state);
      const [left] = await tx
        .insert(tradeFeedback)
        .values({
          tradeId: trade.id,
          fromUserId: userId,
          toUserId: counterpartId,
          fromAddress: addresses[by],
          toAddress: addresses[other],
          raterSide: by,
          role: feedbackRole(trade.state.items, by),
          rating: data.rating,
          comment: data.comment,
          communication: data.communication ?? null,
          speed: data.speed ?? null,
          scored,
        })
        .onConflictDoNothing()
        .returning({ id: tradeFeedback.id });
      if (!left) refuseFeedback("feedback_already_left");

      if (scored) {
        await addFeedbackStats(tx, {
          address: addresses[other],
          rating: data.rating,
          by: 1,
        });
      }
      await notifyUsers(
        tx,
        users.filter(({ id }) => id === counterpartId),
        {
          type: "feedback_received",
          offerId: trade.id,
          actorId: userId,
          tokenId: null,
        },
      );
    });
  });

/**
 * Remove a rating as a moderator, for good. A rating the caller left or
 * received is refused as their own; one that doesn't exist answers as not
 * found.
 */
export const $removeFeedback = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ feedback: ["remove-any"] })])
  .validator(removeFeedbackSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    await consumeRateLimit({
      key: `feedback-remove:${staffId}`,
      limit: 30,
      window: "10 minutes",
    });

    const target = await db.query.tradeFeedback.findFirst({
      where: { id: data.feedbackId },
      columns: { tradeId: true, fromUserId: true, toUserId: true },
    });
    if (!target) refuseFeedback("feedback_not_found");
    if (target.fromUserId === staffId || target.toUserId === staffId) {
      refuseTrade("trade_own");
    }

    const { feedbackId, reportId } = data;
    const { tradeId } = target;
    /**
     * The trade is locked first, as the lock order puts trades before their
     * ratings. The removed rating stops counting towards its address's
     * stats, posts a staff event in the trade, is audited against the report
     * it was taken from, and resolves every open report on it. A rating
     * already removed answers as not found.
     */
    await db.transaction(async (tx) => {
      await tx
        .select({ id: tradeOffers.id })
        .from(tradeOffers)
        .where(eq(tradeOffers.id, tradeId))
        .for("no key update");

      const [removed] = await tx
        .update(tradeFeedback)
        .set({ removedAt: sql`now()` })
        .where(
          and(
            eq(tradeFeedback.id, feedbackId),
            isNull(tradeFeedback.removedAt),
          ),
        )
        .returning({
          toAddress: tradeFeedback.toAddress,
          raterSide: tradeFeedback.raterSide,
          rating: tradeFeedback.rating,
          scored: tradeFeedback.scored,
        });
      if (!removed) refuseFeedback("feedback_not_found");

      if (removed.scored) {
        await addFeedbackStats(tx, {
          address: removed.toAddress,
          rating: removed.rating,
          by: -1,
        });
      }
      await insertTradeEvent(tx, tradeId, {
        type: "feedback_removed",
        side: removed.raterSide,
      });

      const linkedReport =
        reportId === undefined
          ? undefined
          : await tx.query.reports.findFirst({
              where: {
                id: reportId,
                targetType: "feedback",
                targetId: feedbackId,
              },
              columns: { id: true },
            });
      await recordStaffAudit(tx, {
        staffId,
        action: "feedback:remove",
        feedbackId,
        reportId: linkedReport?.id ?? null,
        detail: { kind: "feedback", tradeId },
      });
      await resolveTargetReports(tx, staffId, "feedback", feedbackId);
    });
    await publishTradeUpdates([tradeId]);
  });

/**
 * An address's feedback summary for its feedback page, in one pass over its
 * visible ratings. Anyone may read it, and nothing in it depends on the
 * viewer.
 */
export const $fetchFeedbackSummary = createServerFn({ method: "GET" })
  .validator(feedbackSummaryInputSchema)
  .handler(async ({ data }): Promise<FeedbackSummary> => {
    const { rating, role, scored, communication, speed } = tradeFeedback;
    const count = (filter: SQL) =>
      sql<number>`count(*) filter (where ${filter})::int`.mapWith(Number);
    // a rating that doesn't count leaves the star averages alone too
    const stars = (column: typeof communication) => ({
      sum: sql<number>`coalesce(sum(${column}) filter (where ${scored}), 0)::int`.mapWith(
        Number,
      ),
      count:
        sql<number>`count(${column}) filter (where ${scored})::int`.mapWith(
          Number,
        ),
    });
    // the score and the share are the stats row's, of scored ratings alone
    const statsColumn = (column: AnyPgColumn) =>
      db
        .select({ value: column })
        .from(userFeedbackStats)
        .where(eq(userFeedbackStats.address, data.address));

    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`.mapWith(Number),
        positive: count(eq(rating, "positive")),
        neutral: count(eq(rating, "neutral")),
        negative: count(eq(rating, "negative")),
        score:
          sql<number>`coalesce((${statsColumn(userFeedbackStats.score)}), 0)`.mapWith(
            Number,
          ),
        percent: sql<
          number | null
        >`(${statsColumn(userFeedbackStats.percentPositive)})`,
        communication: stars(communication),
        speed: stars(speed),
        // the stored role is the rater's, the inverse of the one rated in
        buyer: count(eq(role, ratedRole("buyer"))),
        seller: count(eq(role, ratedRole("seller"))),
        trader: count(eq(role, ratedRole("trader"))),
      })
      .from(tradeFeedback)
      .where(
        and(
          eq(tradeFeedback.toAddress, data.address),
          isNull(tradeFeedback.removedAt),
        ),
      );
    if (row === undefined) throw new Error("aggregate without a row");

    return {
      total: row.total,
      score: row.score,
      percent: row.percent,
      counts: {
        positive: row.positive,
        neutral: row.neutral,
        negative: row.negative,
      },
      communication: {
        average: averageStars(row.communication.sum, row.communication.count),
        count: row.communication.count,
      },
      speed: {
        average: averageStars(row.speed.sum, row.speed.count),
        count: row.speed.count,
      },
      roles: { buyer: row.buyer, seller: row.seller, trader: row.trader },
    };
  });

const FEEDBACK_PAGE_SIZE = 20;

/**
 * One page of an address's visible feedback, newest first, keyset-paged on
 * (created_at, id) through the address's profile index. Removed ratings
 * never show here, not even to the address's owner. Each rating comes with
 * its rater's name and own score, read through the rater's pinned address,
 * and the listing its trade came from.
 */
export const $fetchFeedbackEntries = createServerFn({ method: "GET" })
  .validator(feedbackEntriesInputSchema)
  .handler(async ({ data }): Promise<FeedbackEntriesPage> => {
    const { cursor } = data;
    const cursorRow = alias(tradeFeedback, "cursor_row");
    const rows = await db.query.tradeFeedback.findMany({
      where: {
        toAddress: data.address,
        removedAt: { isNull: true },
        // the stored role is the rater's, the inverse of the one rated in
        role: data.role === "all" ? EmptyFilter : ratedRole(data.role),
        rating: data.rating === "all" ? EmptyFilter : data.rating,
        RAW:
          cursor === undefined
            ? EmptyFilter
            : (t) =>
                sql`(${t.createdAt}, ${t.id}) < (${db
                  .select({ createdAt: cursorRow.createdAt, id: cursorRow.id })
                  .from(cursorRow)
                  .where(eq(cursorRow.id, cursor))})`,
      },
      columns: {
        id: true,
        rating: true,
        comment: true,
        communication: true,
        speed: true,
        role: true,
        scored: true,
        createdAt: true,
        fromUserId: true,
        toUserId: true,
      },
      extras: {
        // the listing the trade was claimed from, which its listing items name
        listingId: (t) =>
          sql<string | null>`(${db
            .select({ listingId: tradeOfferItems.listingId })
            .from(tradeOfferItems)
            .where(
              and(
                eq(tradeOfferItems.offerId, t.tradeId),
                isNotNull(tradeOfferItems.listingId),
              ),
            )
            .limit(1)})`,
      },
      with: {
        fromUser: true,
        fromCosmo: { columns: { username: true } },
        fromStats: { columns: { score: true } },
      },
      orderBy: { createdAt: "desc", id: "desc" },
      limit: FEEDBACK_PAGE_SIZE + 1,
    });
    const page = rows.slice(0, FEEDBACK_PAGE_SIZE);

    return {
      rows: page.map((row) => {
        const rater = toPartyName(row.fromUserId, row.fromUser, row.fromCosmo);
        return {
          id: row.id,
          rating: row.rating,
          comment: row.comment,
          communication: row.communication,
          speed: row.speed,
          role: ratedRole(row.role),
          scored: row.scored,
          createdAt: row.createdAt,
          rater: {
            ...rater,
            score: rater.user === null ? null : (row.fromStats?.score ?? 0),
          },
          ratedUserId: row.toUserId,
          listingId: row.listingId,
        };
      }),
      nextCursor: rows.length > page.length ? page.at(-1)?.id : undefined,
    };
  });
