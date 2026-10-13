import { db } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { actOnTrade, completeAsStaff } from "@/lib/server/staff-trades.server";
import {
  endTrade,
  insertTradeEvent,
  notifyUsers,
  refuseTrade,
  updateLockedTrade,
} from "@/lib/server/trades/trade.server";
import {
  staffExtendTradeInputSchema,
  staffTradeInputSchema,
  tradeIdInputSchema,
} from "@/lib/universal/schema/trades";
import { tradeMessages } from "@apollo/database/web/schema";
import { extendedDeadline } from "@apollo/trades/timers";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";

/**
 * Record that a staff member opened a trade they aren't a party to. The
 * trade page calls it once when it mounts, never from its loader, and a
 * repeat visit within 10 minutes isn't recorded again.
 */
export const $recordTradeView = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ trade: ["read-any"] })])
  .validator(tradeIdInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    const trade = await db.query.tradeOffers.findFirst({
      where: { id: data.tradeId, kind: "trade" },
      columns: { fromUserId: true, toUserId: true, disputeReportId: true },
    });
    if (!trade) refuseTrade("trade_not_found");
    if (trade.fromUserId === staffId || trade.toUserId === staffId) {
      refuseTrade("trade_own");
    }

    await recordStaffAudit(db, {
      staffId,
      action: "trade:read",
      tradeId: data.tradeId,
      reportId: trade.disputeReportId,
    });
  });

/**
 * Complete a disputed trade, whatever its items have done.
 */
export const $staffCompleteTrade = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ trade: ["resolve-dispute"] })])
  .validator(staffTradeInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    return actOnTrade(
      staffId,
      data,
      { type: "staff_complete" },
      async (tx, trade, users, next) => {
        await completeAsStaff(tx, trade, users, next, data.note);
        return { action: "trade:complete" };
      },
    );
  });

/**
 * Cancel an accepted or disputed trade without abandoned marks. The listing
 * reopens if the poster can still offer it, breaks if not, and is removed
 * when the poster is banned. Both parties are told; for a disputed trade,
 * that the dispute was resolved.
 */
export const $staffCancelTrade = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ trade: ["cancel-any"] })])
  .validator(staffTradeInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    return actOnTrade(
      staffId,
      data,
      { type: "staff_cancel" },
      async (tx, trade, users, next) => {
        await endTrade(tx, trade, next, users);
        await insertTradeEvent(tx, trade.id, {
          type: "cancelled",
          by: "staff",
          note: data.note,
        });
        await notifyUsers(tx, users, {
          type:
            trade.state.status === "disputed"
              ? "trade_dispute_resolved"
              : "trade_cancelled",
          offerId: trade.id,
          actorId: null,
          tokenId: null,
        });
        return { action: "trade:cancel" };
      },
    );
  });

/**
 * Give a disputed trade a new deadline: the time it had left when it was
 * last frozen, plus the hours picked. It goes back to accepted without its
 * dispute report, which this resolves. A trade whose items all arrived while
 * disputed completes instead, recorded as a staff complete, which the
 * returned audit action tells the caller.
 */
export const $staffExtendTradeDeadline = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ trade: ["resolve-dispute"] })])
  .validator(staffExtendTradeInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    return actOnTrade(
      staffId,
      data,
      { type: "staff_extend" },
      async (tx, trade, users, next) => {
        if (next.status === "completed") {
          await completeAsStaff(tx, trade, users, next, data.note);
          return { action: "trade:complete" };
        }

        const [frozen] = await tx
          .select({ createdAt: tradeMessages.createdAt })
          .from(tradeMessages)
          .where(
            and(
              eq(tradeMessages.tradeId, trade.id),
              eq(tradeMessages.kind, "event"),
              sql`${tradeMessages.event}->>'type' = 'disputed'`,
            ),
          )
          .orderBy(desc(tradeMessages.id))
          .limit(1);
        if (!frozen || trade.deadlineAt === null) {
          throw new Error(
            `Disputed trade ${trade.id} has no deadline or event`,
          );
        }

        const deadlineAt = extendedDeadline(
          trade.deadlineAt,
          frozen.createdAt,
          new Date(),
          data.hours,
        );
        await updateLockedTrade(tx, trade, {
          status: "accepted",
          deadlineAt,
          disputeReportId: null,
        });

        await insertTradeEvent(tx, trade.id, {
          type: "deadline_extended",
          deadlineAt: deadlineAt.toISOString(),
          note: data.note,
        });
        await notifyUsers(tx, users, {
          type: "trade_deadline_extended",
          offerId: trade.id,
          actorId: null,
          tokenId: null,
        });
        return {
          action: "trade:extend",
          detail: {
            kind: "trade-extend",
            deadlineAt: deadlineAt.toISOString(),
            hours: data.hours,
          },
        };
      },
    );
  });
