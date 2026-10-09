import { auth } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import { resolveUserReports } from "@/lib/server/reports.server";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { guardUserChange } from "@/lib/server/staff-users.server";
import { publishUserEvent } from "@/lib/server/user-events.server";
import {
  banUserInputSchema,
  unbanUserInputSchema,
} from "@/lib/universal/schema/staff-users";
import { user } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

/**
 * Ban a user and sign them out. The plugin commits the ban, then one
 * transaction writes the audit row and, for a ban started from a report on
 * the user, resolves every open report on them, each with its own audit row.
 * The event is published once that commits.
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

    await db.transaction(async (tx) => {
      /**
       * Without a length the plugin leaves `ban_expires` as it was, so a
       * lapsed earlier ban would lift this permanent one at the next sign-in.
       */
      if (data.expiresIn === null) {
        await tx
          .update(user)
          .set({ banExpires: null })
          .where(eq(user.id, data.userId));
      }

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
        await resolveUserReports(tx, staffId, data.userId);
      }
    });

    await publishUserEvent({
      type: "banned",
      userId: data.userId,
      expiresAt:
        data.expiresIn === null
          ? null
          : (banned.user.banExpires?.toISOString() ?? null),
    });
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
