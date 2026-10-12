import { auth } from "@/lib/server/auth.server";
import { db, type WebTx } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import { resolveTargetReports } from "@/lib/server/reports.server";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { guardUserChange } from "@/lib/server/staff-users.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { closeOpenOffers } from "@/lib/server/trades.server";
import {
  disputeTrade,
  insertTradeEvent,
  lockTrade,
  notifyUsers,
} from "@/lib/server/trades/trade.server";
import { publishUserEvent } from "@/lib/server/user-events.server";
import {
  type BanUserInput,
  banUserInputSchema,
  unbanUserInputSchema,
} from "@/lib/universal/schema/staff-users";
import { tradeOffers, user } from "@apollo/database/web/schema";
import { transition } from "@apollo/trades/lifecycle";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, eq, inArray, or } from "drizzle-orm";

/**
 * Ban a user and sign them out. The plugin commits the ban, then one
 * transaction writes the audit row, for a ban started from a report on the
 * user resolves every open report on them, each with its own audit row, and
 * sweeps their trades and listings (sweepBannedUser). The user event and the
 * disputed trades are published once that commits.
 */
export const $banUser = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ user: ["ban"] })])
  .validator(banUserInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    await guardUserChange({ id: staffId, role: context.role }, data.userId, {
      kind: "ban",
    });

    const banned = await auth.api.banUser({
      headers: getRequestHeaders(),
      body: {
        userId: data.userId,
        banReason: data.reason,
        banExpiresIn: data.expiresIn ?? undefined,
      },
    });

    const disputedIds = await db.transaction(async (tx) => {
      const linkedReport = data.reportId
        ? await tx.query.reports.findFirst({
            where: {
              id: data.reportId,
              targetType: "user",
              targetId: data.userId,
            },
            columns: { id: true },
          })
        : undefined;

      await recordStaffAudit(tx, {
        staffId,
        action: "user:ban",
        userId: data.userId,
        reportId: linkedReport?.id ?? null,
        detail: { kind: "ban", expiresIn: data.expiresIn, reason: data.reason },
      });
      if (linkedReport) {
        await resolveTargetReports(tx, staffId, "user", data.userId);
      }

      return sweepBannedUser(tx, staffId, data);
    });

    await publishUserEvent({
      type: "banned",
      userId: data.userId,
      expiresAt:
        data.expiresIn === null
          ? null
          : (banned.user.banExpires?.toISOString() ?? null),
    });
    await publishTradeUpdates(disputedIds);
  });

/**
 * Puts a banned user's accepted trades on hold under a dispute the ban files
 * for each, so neither side can be timed out or marked abandoned while staff
 * complete or cancel it, then removes their open listings and closes their
 * pending offers. The user and every counterparty are locked first, in one
 * statement ordered by id and `FOR NO KEY UPDATE`, so a permanent ban's
 * write to the user's row takes no lock out of order. Trades are disputed
 * before listings are touched, the lock order every trade write keeps.
 * Trades already disputed keep their party's report. The plugin has already
 * committed the ban, so no new trade can start, and banning again re-runs
 * the sweep over whatever is left. Returns the disputed trades' ids.
 */
async function sweepBannedUser(
  tx: WebTx,
  staffId: string,
  { userId, reason, expiresIn }: BanUserInput,
) {
  const trades = await tx
    .select({
      id: tradeOffers.id,
      fromUserId: tradeOffers.fromUserId,
      toUserId: tradeOffers.toUserId,
    })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.kind, "trade"),
        eq(tradeOffers.status, "accepted"),
        or(
          eq(tradeOffers.fromUserId, userId),
          eq(tradeOffers.toUserId, userId),
        ),
      ),
    )
    .orderBy(asc(tradeOffers.id));
  const users = await tx
    .select({ id: user.id, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(
      inArray(user.id, [
        userId,
        ...trades.flatMap((trade) =>
          [trade.fromUserId, trade.toUserId].flatMap((id) => id ?? []),
        ),
      ]),
    )
    .orderBy(asc(user.id))
    .for("no key update");

  /**
   * Without a length the plugin leaves `ban_expires` as it was, so a lapsed
   * earlier ban would lift this permanent one at the next sign-in.
   */
  if (expiresIn === null) {
    await tx.update(user).set({ banExpires: null }).where(eq(user.id, userId));
  }

  const disputedIds: string[] = [];
  for (const { id } of trades) {
    const trade = await lockTrade(tx, id);
    if (!transition(trade.state, { type: "dispute", by: "staff" }).ok) {
      continue;
    }

    const reportId = await disputeTrade(tx, trade, {
      reporterId: staffId,
      reason: "party_banned",
      note: reason,
    });
    await insertTradeEvent(tx, trade.id, {
      type: "disputed",
      by: "staff",
      reportId,
    });
    await notifyUsers(
      tx,
      users.filter(
        (row) =>
          row.id !== userId &&
          (row.id === trade.fromUserId || row.id === trade.toUserId),
      ),
      {
        type: "trade_disputed",
        offerId: trade.id,
        actorId: null,
        tokenId: null,
      },
    );
    await recordStaffAudit(tx, {
      staffId,
      action: "trade:dispute",
      tradeId: trade.id,
      reportId,
    });
    disputedIds.push(trade.id);
  }

  await closeOpenOffers(tx, userId, "removed");
  return disputedIds;
}

/**
 * Lift a user's ban. The audit row is written before the event is published.
 */
export const $unbanUser = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ user: ["ban"] })])
  .validator(unbanUserInputSchema)
  .handler(async ({ data, context }) => {
    await guardUserChange(
      { id: context.session.user.id, role: context.role },
      data.userId,
      { kind: "unban" },
    );

    await auth.api.unbanUser({
      headers: getRequestHeaders(),
      body: { userId: data.userId },
    });

    await recordStaffAudit(db, {
      staffId: context.session.user.id,
      action: "user:unban",
      userId: data.userId,
    });
    await publishUserEvent({ type: "unbanned", userId: data.userId });
  });
