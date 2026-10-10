import { env } from "@/lib/env/server";
import { decodeCursor, encodeCursor } from "@/lib/server/cursor.server";
import { db } from "@/lib/server/db";
import type { DbOrTx } from "@/lib/server/db";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import {
  fetchStaffUsernames,
  namedUserColumns,
  staffName,
  staffUsername,
} from "@/lib/server/staff-users.server";
import type { NamedUser } from "@/lib/server/staff-users.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { openReportStatuses } from "@/lib/universal/reports";
import type {
  AdminReportDetail,
  AdminReportDetailTarget,
  AdminReportRow,
  AdminReportRowTarget,
  ReportOutcome,
} from "@/lib/universal/reports";
import type {
  ReportCountsInput,
  ReportQueueInput,
} from "@/lib/universal/schema/reports";
import type { Role } from "@apollo/auth";
import { isBanActive, protectionFor } from "@apollo/auth/guard";
import { reports } from "@apollo/database/web/schema";
import type {
  ReportStatus,
  ReportTargetType,
} from "@apollo/database/web/types";
import { and, EmptyFilter, eq, inArray, ne, or, sql } from "drizzle-orm";

const QUEUE_PAGE_SIZE = 30;

/**
 * Reports on a staff member are hidden from them, whatever their role, so
 * they never see who reported them; other staff handle those. Relational
 * reads alias the table, so they filter with `NOT: reportsOn(staffId)`.
 */
function visibleTo(staffId: string) {
  return or(ne(reports.targetType, "user"), ne(reports.targetId, staffId));
}

function reportsOn(userId: string) {
  return { targetType: "user", targetId: userId } as const;
}

/**
 * The refusal for a report id a staff member may not see: it is about them,
 * or it doesn't exist.
 */
async function hiddenReportError(executor: DbOrTx, id: string) {
  const exists = await executor.$count(reports, eq(reports.id, id));
  return new ExpectedError(
    exists > 0 ? "report_about_you" : "report_not_found",
  );
}

/**
 * Open and escalated counts of the reports the staff member may see,
 * optionally of one target type.
 */
export async function fetchReportCounts(
  staffId: string,
  input: ReportCountsInput,
) {
  const [counts] = await db
    .select({
      open: sql<number>`count(*) filter (where ${eq(reports.status, "open")})::int`.mapWith(
        Number,
      ),
      escalated:
        sql<number>`count(*) filter (where ${eq(reports.status, "escalated")})::int`.mapWith(
          Number,
        ),
    })
    .from(reports)
    .where(
      and(
        // redundant with the FILTERs, but keeps the status index in play
        inArray(reports.status, [...openReportStatuses]),
        visibleTo(staffId),
        input.targetType ? eq(reports.targetType, input.targetType) : undefined,
      ),
    );

  return counts ?? { open: 0, escalated: 0 };
}

/**
 * One page of the staff member's queue, newest first. The cursor carries
 * `created_at` as Postgres text, which keeps the microseconds a JS Date would
 * drop.
 */
export async function fetchReportQueue(
  staffId: string,
  input: ReportQueueInput,
) {
  const after = decodeCursor(input.cursor);
  const rows = await db.query.reports.findMany({
    where: {
      status: input.status,
      NOT: reportsOn(staffId),
      targetType: input.targetType ?? EmptyFilter,
      RAW: after
        ? (t) =>
            sql`(${t.createdAt}, ${t.id}) < (${after.timestamp}::timestamp, ${after.id}::uuid)`
        : EmptyFilter,
    },
    columns: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      createdAt: true,
    },
    extras: {
      cursorAt: (t) => sql<string>`${t.createdAt}::text`,
    },
    orderBy: { createdAt: "desc", id: "desc" },
    limit: QUEUE_PAGE_SIZE,
    with: {
      reporter: { columns: namedUserColumns },
    },
  });

  const usernames = await fetchStaffUsernames(
    rows.filter((row) => row.targetType === "user").map((row) => row.targetId),
  );

  const last = rows.at(-1);
  return {
    rows: rows.map((row): AdminReportRow => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.createdAt,
      reporter: staffName(row.reporter),
      target: toRowTarget(row.targetType, row.targetId, usernames),
    })),
    nextCursor:
      rows.length === QUEUE_PAGE_SIZE && last
        ? encodeCursor(last.cursorAt, last.id)
        : undefined,
  };
}

function toRowTarget(
  targetType: ReportTargetType,
  targetId: string,
  usernames: Map<string, string>,
): AdminReportRowTarget {
  switch (targetType) {
    case "user": {
      const username = usernames.get(targetId);
      return {
        type: "user",
        user: username === undefined ? null : { username },
      };
    }
    case "message":
    case "listing":
    case "feedback":
    case "trade":
      throw new Error(`Reports on ${targetType} targets aren't supported yet`);
  }
}

/**
 * A report with everything staff need to act on it. Throws
 * `report_about_you` for a report on the viewer and `report_not_found` for an
 * unknown id.
 */
export async function fetchReportDetail(
  viewer: { id: string; role: Role },
  id: string,
): Promise<AdminReportDetail> {
  const report = await db.query.reports.findFirst({
    where: { id, NOT: reportsOn(viewer.id) },
    with: {
      reporter: { columns: namedUserColumns },
      resolver: { columns: namedUserColumns },
    },
  });

  if (!report) {
    throw await hiddenReportError(db, id);
  }

  const [target, otherOpenReportCount] = await Promise.all([
    fetchDetailTarget(viewer.role, report.targetType, report.targetId),
    db.$count(
      reports,
      and(
        eq(reports.targetType, report.targetType),
        eq(reports.targetId, report.targetId),
        inArray(reports.status, [...openReportStatuses]),
        ne(reports.id, report.id),
      ),
    ),
  ]);

  return {
    ...toOutcome(report),
    id: report.id,
    reason: report.reason,
    note: report.note,
    createdAt: report.createdAt,
    reporter: staffName(report.reporter),
    otherOpenReportCount,
    target,
  };
}

async function fetchDetailTarget(
  viewerRole: Role,
  targetType: ReportTargetType,
  targetId: string,
): Promise<AdminReportDetailTarget> {
  switch (targetType) {
    case "user": {
      const user = await db.query.user.findFirst({
        where: { id: targetId },
        columns: {
          id: true,
          ...namedUserColumns,
          email: true,
          emailVerified: true,
          role: true,
          banned: true,
          banExpires: true,
        },
        with: {
          cosmoAccount: { columns: { username: true } },
        },
      });

      if (!user) {
        return { type: "user", user: null };
      }

      return {
        type: "user",
        user: {
          id: user.id,
          username: staffUsername(user),
          role: user.role,
          ban: isBanActive(user) ? { until: user.banExpires } : null,
          profile: user.cosmoAccount?.username ?? null,
          protected: protectionFor(
            viewerRole,
            user,
            env.PROTECTED_EMAIL_DOMAINS,
          ),
        },
      };
    }
    case "message":
    case "listing":
    case "feedback":
    case "trade":
      throw new Error(`Reports on ${targetType} targets aren't supported yet`);
  }
}

function toOutcome(report: {
  id: string;
  status: ReportStatus;
  resolvedAt: Date | null;
  resolver: NamedUser | null;
}): ReportOutcome {
  switch (report.status) {
    case "open":
    case "escalated":
      return { status: report.status };
    case "resolved":
    case "dismissed":
      // reports_resolved_chk ties resolved_at to the closed statuses
      if (report.resolvedAt === null) {
        throw new Error(`Report ${report.id} is closed without resolved_at`);
      }
      return {
        status: report.status,
        resolvedAt: report.resolvedAt,
        resolver: staffName(report.resolver),
      };
  }
}

type ReportAction = "report:resolve" | "report:dismiss" | "report:escalate";

type ReportTransition = {
  from: ReportStatus[];
  set: Partial<typeof reports.$inferInsert>;
};

/**
 * The statuses an action may leave and the columns it sets.
 */
function reportTransition(
  action: ReportAction,
  staffId: string,
): ReportTransition {
  switch (action) {
    case "report:resolve":
    case "report:dismiss":
      return {
        from: [...openReportStatuses],
        set: {
          status: action === "report:resolve" ? "resolved" : "dismissed",
          resolvedBy: staffId,
          resolvedAt: new Date(),
        },
      };
    case "report:escalate":
      return { from: ["open"], set: { status: "escalated" } };
  }
}

/**
 * Moves a report to its next status and audits the action in one
 * transaction. The status guard turns a lost race into
 * `report_status_changed` instead of overwriting another staff member, and a
 * report on the staff member is refused as it is for reads.
 */
export async function transitionReport(
  staffId: string,
  id: string,
  action: ReportAction,
) {
  const { from, set } = reportTransition(action, staffId);

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(reports)
      .set(set)
      .where(
        and(
          eq(reports.id, id),
          inArray(reports.status, from),
          visibleTo(staffId),
        ),
      )
      .returning({ id: reports.id });

    if (!updated) {
      const visible = await tx.$count(
        reports,
        and(eq(reports.id, id), visibleTo(staffId)),
      );
      throw visible > 0
        ? new ExpectedError("report_status_changed")
        : await hiddenReportError(tx, id);
    }

    await recordStaffAudit(tx, { staffId, action, reportId: id });
  });
}

/**
 * Resolves every open report on a user, auditing each one, as a ban started
 * from a report does.
 */
export async function resolveUserReports(
  tx: DbOrTx,
  staffId: string,
  userId: string,
) {
  const { from, set } = reportTransition("report:resolve", staffId);

  const resolved = await tx
    .update(reports)
    .set(set)
    .where(
      and(
        eq(reports.targetType, "user"),
        eq(reports.targetId, userId),
        inArray(reports.status, from),
      ),
    )
    .returning({ id: reports.id });

  await recordStaffAudit(
    tx,
    resolved.map((report) => ({
      staffId,
      action: "report:resolve",
      reportId: report.id,
    })),
  );
}
