import { db, type WebTx } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import { resolveTargetReports } from "@/lib/server/reports.server";
import {
  recordStaffAudit,
  type StaffAuditEntry,
} from "@/lib/server/staff-audit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import {
  endTrade,
  insertTradeEvent,
  type LockedTrade,
  type LockedUser,
  lockParties,
  lockTrade,
  notifyUsers,
} from "@/lib/server/trades/trade.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import type { TradeErrorCode } from "@/lib/universal/errors/trades";
import {
  staffExtendTradeInputSchema,
  staffTradeInputSchema,
} from "@/lib/universal/schema/trades";
import { isBanActive } from "@apollo/auth/guard";
import { tradeMessages, tradeOffers } from "@apollo/database/web/schema";
import { type TradeState, transition } from "@apollo/trades/lifecycle";
import { extendedDeadline } from "@apollo/trades/timers";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";

function refuse(code: TradeErrorCode): never {
  throw new ExpectedError(code);
}

/**
 * Runs a staff action on a trade, which staff can't take on their own
 * trades: locks its parties, then the trade, and lets `act` write the change
 * and name its audit entry. Every open or escalated report on the trade is
 * resolved with it, and the trade is published once that commits.
 */
async function actOnTrade(
  staffId: string,
  tradeId: string,
  act: (
    tx: WebTx,
    trade: LockedTrade,
    users: LockedUser[],
  ) => Promise<StaffAuditEntry>,
) {
  const parties = await db.query.tradeOffers.findFirst({
    where: { id: tradeId, kind: "trade" },
    columns: { fromUserId: true, toUserId: true },
  });
  if (!parties) refuse("trade_not_found");
  if (parties.fromUserId === staffId || parties.toUserId === staffId) {
    refuse("trade_own");
  }

  await db.transaction(async (tx) => {
    const users = await lockParties(tx, [parties.fromUserId, parties.toUserId]);
    const trade = await lockTrade(tx, tradeId);
    await recordStaffAudit(tx, await act(tx, trade, users));
    await resolveTargetReports(tx, staffId, "trade", tradeId);
  });
  await publishTradeUpdates([tradeId]);
}

/**
 * Ends a disputed trade as completed by staff: its listing is filled and
 * both parties are told the dispute was resolved. Items that never arrived
 * keep no transfer; the staff event records how the trade ended.
 */
async function completeAsStaff(
  tx: WebTx,
  trade: LockedTrade,
  users: LockedUser[],
  next: TradeState,
  note: string | null,
) {
  await endTrade(
    tx,
    trade,
    next,
    users.find((row) => row.id === trade.fromUserId),
  );
  await insertTradeEvent(tx, trade.id, {
    type: "completed",
    by: "staff",
    note,
  });
  await notifyUsers(tx, users, {
    type: "trade_dispute_resolved",
    offerId: trade.id,
    actorId: null,
    tokenId: null,
  });
}

/**
 * Complete a disputed trade, whatever its items have done.
 */
export const $staffCompleteTrade = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ trade: ["resolve-dispute"] })])
  .validator(staffTradeInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    await actOnTrade(staffId, data.tradeId, async (tx, trade, users) => {
      const result = transition(trade.state, { type: "staff_complete" });
      if (!result.ok) refuse("trade_status_changed");

      await completeAsStaff(tx, trade, users, result.trade, data.note);
      return {
        staffId,
        action: "trade:complete",
        tradeId: trade.id,
        reportId: trade.disputeReportId,
      };
    });
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
    await actOnTrade(staffId, data.tradeId, async (tx, trade, users) => {
      const result = transition(trade.state, { type: "staff_cancel" });
      if (!result.ok) refuse("trade_status_changed");

      await endTrade(
        tx,
        trade,
        result.trade,
        users.find((row) => row.id === trade.fromUserId),
      );
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
      return {
        staffId,
        action: "trade:cancel",
        tradeId: trade.id,
        reportId: trade.disputeReportId,
      };
    });
  });

/**
 * Give a disputed trade a new deadline: the time it had left when it was
 * last frozen, plus the hours picked. It goes back to accepted without its
 * dispute report, which this resolves. A trade whose items all arrived while
 * disputed completes instead, recorded as a staff complete. Refused while a
 * party is banned, since the timers skip their trades and nothing could
 * end it; staff complete or cancel it instead.
 */
export const $staffExtendTradeDeadline = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ trade: ["resolve-dispute"] })])
  .validator(staffExtendTradeInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    await actOnTrade(staffId, data.tradeId, async (tx, trade, users) => {
      const result = transition(trade.state, { type: "staff_extend" });
      if (!result.ok) refuse("trade_status_changed");
      if (users.some((row) => isBanActive(row))) refuse("trade_party_banned");

      if (result.trade.status === "completed") {
        await completeAsStaff(tx, trade, users, result.trade, data.note);
        return {
          staffId,
          action: "trade:complete",
          tradeId: trade.id,
          reportId: trade.disputeReportId,
        };
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
        throw new Error(`Disputed trade ${trade.id} has no deadline or event`);
      }

      const deadlineAt = extendedDeadline(
        trade.deadlineAt,
        frozen.createdAt,
        new Date(),
        data.hours,
      );
      const [extended] = await tx
        .update(tradeOffers)
        .set({ status: "accepted", deadlineAt, disputeReportId: null })
        .where(
          and(
            eq(tradeOffers.id, trade.id),
            eq(tradeOffers.status, trade.state.status),
          ),
        )
        .returning({ id: tradeOffers.id });
      if (!extended) throw new Error("Trade changed under its lock");

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
        staffId,
        action: "trade:extend",
        tradeId: trade.id,
        reportId: trade.disputeReportId,
        detail: {
          kind: "trade-extend",
          deadlineAt: deadlineAt.toISOString(),
          hours: data.hours,
        },
      };
    });
  });
