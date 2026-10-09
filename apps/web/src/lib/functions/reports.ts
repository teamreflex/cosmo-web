import { db } from "@/lib/server/db";
import {
  authenticatedMiddleware,
  staffMiddleware,
} from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import {
  fetchReportDetail,
  fetchReportQueue,
  transitionReport,
} from "@/lib/server/reports.server";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { openReportStatuses } from "@/lib/universal/reports";
import type { MyReport } from "@/lib/universal/reports";
import {
  createReportSchema,
  reportCountsSchema,
  reportIdSchema,
  reportQueueSchema,
  reportTargetSchema,
} from "@/lib/universal/schema/reports";
import { reports } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";

/**
 * Report a user. One open report per reporter and target, and a generous
 * rate limit so a burst of reports can't flood the queue.
 */
export const $createReport = createServerFn({ method: "POST" })
  .validator(createReportSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    await consumeRateLimit({
      key: `report:${userId}`,
      limit: 5,
      window: "10 minutes",
    });

    if (data.targetId === userId) {
      throw new ExpectedError("report_self");
    }

    const target = await db.query.user.findFirst({
      where: { id: data.targetId },
      columns: { id: true },
    });
    if (!target) {
      throw new ExpectedError("report_target_not_found");
    }

    const [result] = await db
      .insert(reports)
      .values({
        reporterId: userId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        note: data.note,
      })
      .onConflictDoNothing({
        target: [reports.reporterId, reports.targetType, reports.targetId],
        // must match reports_open_reporter_target_idx's predicate verbatim
        where: sql`status IN ('open', 'escalated')`,
      })
      .returning({ id: reports.id });

    // a missing row means the partial unique index suppressed the insert
    if (!result) {
      throw new ExpectedError("report_already_open");
    }

    return result;
  });

/**
 * The caller's open or escalated report on a target, if any.
 */
export const $fetchMyReport = createServerFn({ method: "GET" })
  .validator(reportTargetSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<MyReport> => {
    const report = await db.query.reports.findFirst({
      where: {
        reporterId: context.session.user.id,
        targetType: data.targetType,
        targetId: data.targetId,
        status: { in: [...openReportStatuses] },
      },
      columns: { status: true },
    });

    const status = openReportStatuses.find((open) => open === report?.status);
    return status ? { status } : null;
  });

/**
 * Open and escalated report counts for the staff tabs and sidebar badge,
 * optionally of one target type.
 */
export const $fetchReportCounts = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ report: ["read"] })])
  .validator(reportCountsSchema)
  .handler(async ({ data }) => {
    const ofType = data.targetType
      ? eq(reports.targetType, data.targetType)
      : undefined;
    const [open, escalated] = await Promise.all([
      db.$count(reports, and(eq(reports.status, "open"), ofType)),
      db.$count(reports, and(eq(reports.status, "escalated"), ofType)),
    ]);

    return { open, escalated };
  });

/**
 * One page of the staff report queue for a status.
 */
export const $fetchReportQueue = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ report: ["read"] })])
  .validator(reportQueueSchema)
  .handler(({ data }) => fetchReportQueue(data));

/**
 * A report's full detail. Staff reads are audited, once per visit.
 */
export const $fetchReport = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ report: ["read"] })])
  .validator(reportIdSchema)
  .handler(async ({ data, context }) => {
    const report = await fetchReportDetail(data.id);

    await recordStaffAudit(db, {
      staffId: context.session.user.id,
      action: "report:read",
      reportId: report.id,
    });

    return report;
  });

/**
 * Close an open or escalated report as acted on.
 */
export const $resolveReport = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ report: ["resolve"] })])
  .validator(reportIdSchema)
  .handler(({ data, context }) =>
    transitionReport(context.session.user.id, data.id, "report:resolve"),
  );

/**
 * Close an open or escalated report as needing no action.
 */
export const $dismissReport = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ report: ["resolve"] })])
  .validator(reportIdSchema)
  .handler(({ data, context }) =>
    transitionReport(context.session.user.id, data.id, "report:dismiss"),
  );

/**
 * Hand an open report to the admins, who can ban.
 */
export const $escalateReport = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ report: ["escalate"] })])
  .validator(reportIdSchema)
  .handler(({ data, context }) =>
    transitionReport(context.session.user.id, data.id, "report:escalate"),
  );
