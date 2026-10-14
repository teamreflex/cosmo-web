import { db, type WebTx } from "@/lib/server/db";
import { resolveTargetReports } from "@/lib/server/reports.server";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import {
  endTrade,
  insertTradeEvent,
  type LockedTrade,
  type LockedUser,
  lockParties,
  lockTrade,
  notifyUsers,
  refuseTrade,
} from "@/lib/server/trades/trade.server";
import type { StaffAuditDetail } from "@apollo/database/web/types";
import {
  type TradeEvent,
  type TradeState,
  transition,
} from "@apollo/trades/lifecycle";

/**
 * The audit action a staff trade action records; `actOnTrade` adds the
 * staff member, the trade and its dispute report.
 */
type StaffTradeAction =
  | { action: "trade:complete" | "trade:cancel" }
  | {
      action: "trade:extend";
      detail: Extract<StaffAuditDetail, { kind: "trade-extend" }>;
    };

/**
 * Runs a staff action on a trade, which staff can't take on their own
 * trades: locks its parties, then the trade, refuses the event when the
 * trade's status no longer allows it, and lets `act` write the state it
 * moves to and name its audit entry. Every open or escalated report on the
 * trade is resolved with it, and the trade is published once that commits.
 */
export async function actOnTrade(
  staffId: string,
  tradeId: string,
  event: Extract<
    TradeEvent,
    { type: "staff_complete" | "staff_cancel" | "staff_extend" }
  >,
  act: (
    tx: WebTx,
    trade: LockedTrade,
    users: LockedUser[],
    next: TradeState,
  ) => Promise<StaffTradeAction>,
) {
  const parties = await db.query.tradeOffers.findFirst({
    where: { id: tradeId, kind: "trade" },
    columns: { fromUserId: true, toUserId: true },
  });
  if (!parties) refuseTrade("trade_not_found");
  if (parties.fromUserId === staffId || parties.toUserId === staffId) {
    refuseTrade("trade_own");
  }

  await db.transaction(async (tx) => {
    const users = await lockParties(tx, [parties.fromUserId, parties.toUserId]);
    const trade = await lockTrade(tx, tradeId);
    const result = transition(trade.state, event);
    if (!result.ok) refuseTrade("trade_status_changed");
    await recordStaffAudit(tx, {
      staffId,
      tradeId,
      reportId: trade.disputeReportId,
      ...(await act(tx, trade, users, result.trade)),
    });
    await resolveTargetReports(tx, staffId, "trade", tradeId);
  });
  await publishTradeUpdates([tradeId]);
}

/**
 * Ends a disputed trade as completed by staff: its listing is filled and
 * both parties are told the dispute was resolved. Items that never arrived
 * keep no transfer; the staff event records how the trade ended.
 */
export async function completeAsStaff(
  tx: WebTx,
  trade: LockedTrade,
  users: LockedUser[],
  next: TradeState,
  note: string | null,
) {
  await endTrade(tx, trade, next, users);
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
