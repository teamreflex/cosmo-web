import { auth } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import { resolveTargetReports } from "@/lib/server/reports.server";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { banAndSweep, guardUserChange } from "@/lib/server/staff-users.server";
import { publishTradeUpdates } from "@/lib/server/trade-events.server";
import { publishUserEvent } from "@/lib/server/user-events.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  banUserInputSchema,
  roleUserInputSchema,
  setRoleInputSchema,
  unbanUserInputSchema,
} from "@/lib/universal/schema/staff-users";
import type { RoleUser } from "@/lib/universal/staff-users";
import {
  cosmoAccounts,
  tradeFeedback,
  user,
} from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq, inArray, sql } from "drizzle-orm";

/**
 * Ban a user and sign them out. One transaction bans them and sweeps their
 * trades and listings (banAndSweep), writes the audit row and, for a ban
 * started from a report on the user, on a message they sent or on a rating
 * they left, resolves every open report on that target, each with its own
 * audit row. Once that commits, their sessions are deleted and the user event and the
 * disputed trades are published.
 */
export const $banUser = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ user: ["ban"] })])
  .validator(banUserInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    await guardUserChange({ id: staffId, role: context.role }, data.userId, {
      kind: "ban",
    });

    const { banExpires, disputedIds } = await db.transaction(async (tx) => {
      const banned = await banAndSweep(tx, staffId, data);
      const linkedReport = data.reportId
        ? await tx.query.reports.findFirst({
            where: {
              id: data.reportId,
              OR: [
                { targetType: "user", targetId: data.userId },
                {
                  targetType: "message",
                  messageCopy: { senderId: data.userId },
                },
                {
                  targetType: "feedback",
                  RAW: (t) =>
                    inArray(
                      t.targetId,
                      tx
                        .select({ id: sql<string>`${tradeFeedback.id}::text` })
                        .from(tradeFeedback)
                        .where(eq(tradeFeedback.fromUserId, data.userId)),
                    ),
                },
              ],
            },
            columns: { id: true, targetType: true, targetId: true },
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
        await resolveTargetReports(
          tx,
          staffId,
          linkedReport.targetType,
          linkedReport.targetId,
        );
      }
      return banned;
    });

    const { internalAdapter } = await auth.$context;
    await internalAdapter.deleteUserSessions(data.userId);
    await Promise.all([
      publishUserEvent({
        type: "banned",
        userId: data.userId,
        expiresAt: banExpires?.toISOString() ?? null,
      }),
      publishTradeUpdates(disputedIds),
    ]);
  });

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

/**
 * Change a user's role. The user row is locked first, as every write that
 * locks users does, and the role and its audit row commit together. Once
 * they have, apps/chat hears of it and closes the user's sockets, so their
 * next connection reads the new role. Sessions read the role from the user
 * row on every request, so nothing else needs refreshing.
 */
export const $setRole = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ user: ["set-role"] })])
  .validator(setRoleInputSchema)
  .handler(async ({ data, context }) => {
    const staffId = context.session.user.id;
    await guardUserChange({ id: staffId, role: context.role }, data.userId, {
      kind: "set-role",
      role: data.role,
    });

    const changed = await db.transaction(async (tx) => {
      // the role the change replaces, read under the user's lock
      const [target] = await tx
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, data.userId))
        .for("no key update");
      if (target === undefined) {
        throw new ExpectedError("user_not_found");
      }
      if (target.role === data.role) {
        return false;
      }

      await tx
        .update(user)
        .set({ role: data.role, updatedAt: new Date() })
        .where(eq(user.id, data.userId));
      await recordStaffAudit(tx, {
        staffId,
        action: "user:set-role",
        userId: data.userId,
        detail: { kind: "set-role", from: target.role, to: data.role },
      });
      return true;
    });

    if (changed) {
      await publishUserEvent({
        type: "role-changed",
        userId: data.userId,
        role: data.role,
      });
    }
  });

/**
 * The user who has linked a COSMO address, with their current role, for the
 * role tool; null when no user has linked it. The admin finds the address
 * through COSMO's own user search.
 */
export const $fetchRoleUser = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ user: ["set-role"] })])
  .validator(roleUserInputSchema)
  .handler(async ({ data }): Promise<RoleUser | null> => {
    const [row] = await db
      .select({ id: user.id, role: user.role })
      .from(cosmoAccounts)
      .innerJoin(user, eq(user.id, cosmoAccounts.userId))
      .where(eq(cosmoAccounts.address, data.address));
    return row ?? null;
  });
