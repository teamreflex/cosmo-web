import { staffMiddleware } from "@/lib/server/middlewares";
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
} from "@/lib/universal/schema/trades";
import { isBanActive } from "@apollo/auth/guard";
import { tradeMessages } from "@apollo/database/web/schema";
import { extendedDeadline } from "@apollo/trades/timers";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";

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
 * Cancel an accepted or disputed trade. The poster's objekts are free in
 * the listing's pool again, which closes it if they no longer make a unit.
 * Both parties are told; for a disputed trade, that the dispute was resolved.
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
        await endTrade(tx, trade, next);
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
 * returned audit action tells the caller. Otherwise it is refused while a
 * party is banned.
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
        // a banned party can't sign in to finish it, so staff complete or cancel it
        if (users.some((user) => isBanActive(user))) {
          refuseTrade("trade_party_banned");
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
