import { env } from "@/lib/env/server";
import { decodeCursor, encodeCursor } from "@/lib/server/cursor.server";
import { db } from "@/lib/server/db";
import type { DbOrTx } from "@/lib/server/db";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import {
  fetchStaffUsers,
  staffUser,
  staffUserFields,
} from "@/lib/server/staff-users.server";
import type { StaffUserRow } from "@/lib/server/staff-users.server";
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
import { reports, tradeOffers } from "@apollo/database/web/schema";
import {
  liveTradeStatuses,
  type ReportStatus,
  type ReportTargetType,
} from "@apollo/database/web/types";
import {
  and,
  EmptyFilter,
  eq,
  exists,
  inArray,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";

const QUEUE_PAGE_SIZE = 30;

/**
 * Reports on a staff member, or on a trade they're a party to, are hidden
 * from them, whatever their role, so they never see who reported them or act
 * on their own dispute; other staff handle those. Relational reads alias the
 * table, so they pass theirs as `t`.
 */
function visibleTo(staffId: string, t: typeof reports = reports) {
  return not(aboutStaff(staffId, t));
}

function aboutStaff(staffId: string, t: typeof reports = reports) {
  return or(
    and(eq(t.targetType, "user"), eq(t.targetId, staffId)),
    and(
      eq(t.targetType, "trade"),
      exists(
        db
          .select({ id: tradeOffers.id })
          .from(tradeOffers)
          .where(
            and(
              sql`${tradeOffers.id}::text = ${t.targetId}`,
              or(
                eq(tradeOffers.fromUserId, staffId),
                eq(tradeOffers.toUserId, staffId),
              ),
            ),
          ),
      ),
    ),
  );
}

/**
 * The queue, its counts and the detail read leave trade reports out, since
 * the queue has no trade target yet.
 */
function queued(t: typeof reports = reports) {
  return ne(t.targetType, "trade");
}

/**
 * A trade report is a dispute, which closes only when staff complete, cancel
 * or extend its trade, never through resolve or dismiss: a dismissed dispute
 * would leave its trade frozen.
 */
const closableAsReport = ne(reports.targetType, "trade");

/**
 * The refusal for a report id a staff member may not see: it is about them
 * or their trade, or, for anything else, it doesn't exist.
 */
async function hiddenReportError(
  executor: DbOrTx,
  staffId: string,
  id: string,
) {
  const aboutYou = await executor.$count(
    reports,
    and(eq(reports.id, id), aboutStaff(staffId)),
  );
  return new ExpectedError(
    aboutYou > 0 ? "report_about_you" : "report_not_found",
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
        queued(),
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
      targetType: input.targetType ?? EmptyFilter,
      RAW: (t) =>
        and(
          visibleTo(staffId, t),
          queued(t),
          after
            ? sql`(${t.createdAt}, ${t.id}) < (${after.timestamp}::timestamp, ${after.id}::uuid)`
            : undefined,
        ) ?? EmptyFilter,
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
      reporter: staffUserFields,
    },
  });

  const users = await fetchStaffUsers(
    rows.filter((row) => row.targetType === "user").map((row) => row.targetId),
  );

  const last = rows.at(-1);
  return {
    rows: rows.map((row): AdminReportRow => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.createdAt,
      reporter: staffUser(row.reporter),
      target: toRowTarget(row.targetType, row.targetId, users),
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
  users: Map<string, StaffUserRow>,
): AdminReportRowTarget {
  switch (targetType) {
    case "user":
      return { type: "user", user: staffUser(users.get(targetId) ?? null) };
    case "message":
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
    where: {
      id,
      RAW: (t) => and(visibleTo(viewer.id, t), queued(t)) ?? EmptyFilter,
    },
    with: {
      reporter: staffUserFields,
      resolver: staffUserFields,
    },
  });

  if (!report) {
    throw await hiddenReportError(db, viewer.id, id);
  }

  return {
    ...toOutcome(report),
    id: report.id,
    reason: report.reason,
    note: report.note,
    createdAt: report.createdAt,
    reporter: staffUser(report.reporter),
    otherOpenReportCount: await db.$count(
      reports,
      and(
        eq(reports.targetType, report.targetType),
        eq(reports.targetId, report.targetId),
        inArray(reports.status, [...openReportStatuses]),
        ne(reports.id, report.id),
      ),
    ),
    target: await fetchDetailTarget(
      viewer.role,
      report.targetType,
      report.targetId,
    ),
  };
}

async function fetchDetailTarget(
  viewerRole: Role,
  targetType: ReportTargetType,
  targetId: string,
): Promise<AdminReportDetailTarget> {
  switch (targetType) {
    case "user": {
      const [user, liveTradeCount] = await Promise.all([
        db.query.user.findFirst({
          where: { id: targetId },
          columns: {
            id: true,
            ...staffUserFields.columns,
            email: true,
            emailVerified: true,
            role: true,
            banned: true,
            banExpires: true,
          },
          with: staffUserFields.with,
        }),
        db.$count(
          tradeOffers,
          and(
            eq(tradeOffers.kind, "trade"),
            inArray(tradeOffers.status, [...liveTradeStatuses]),
            or(
              eq(tradeOffers.fromUserId, targetId),
              eq(tradeOffers.toUserId, targetId),
            ),
          ),
        ),
      ]);

      if (!user) {
        return { type: "user", user: null };
      }

      return {
        type: "user",
        user: {
          ...staffUser(user),
          id: user.id,
          role: user.role,
          ban: isBanActive(user) ? { until: user.banExpires } : null,
          liveTradeCount,
          protected: protectionFor(
            viewerRole,
            user,
            env.PROTECTED_EMAIL_DOMAINS,
          ),
        },
      };
    }
    case "message":
    case "feedback":
    case "trade":
      throw new Error(`Reports on ${targetType} targets aren't supported yet`);
  }
}

function toOutcome(report: {
  id: string;
  status: ReportStatus;
  resolvedAt: Date | null;
  resolver: StaffUserRow | null;
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
        resolver: staffUser(report.resolver),
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
 * report on the staff member is refused as it is for reads. A trade report
 * can be escalated, but only settling its trade resolves it.
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
          action === "report:escalate" ? undefined : closableAsReport,
        ),
      )
      .returning({ id: reports.id });

    if (!updated) {
      const [report] = await tx
        .select({ targetType: reports.targetType })
        .from(reports)
        .where(and(eq(reports.id, id), visibleTo(staffId)));
      if (!report) throw await hiddenReportError(tx, staffId, id);
      throw new ExpectedError(
        report.targetType === "trade" && action !== "report:escalate"
          ? "report_trade_dispute"
          : "report_status_changed",
      );
    }

    await recordStaffAudit(tx, { staffId, action, reportId: id });
  });
}

/**
 * Resolves every open report on a target, auditing each one, as a ban
 * started from a report does for its user.
 */
export async function resolveTargetReports(
  tx: DbOrTx,
  staffId: string,
  targetType: ReportTargetType,
  targetId: string,
) {
  const { from, set } = reportTransition("report:resolve", staffId);

  const resolved = await tx
    .update(reports)
    .set(set)
    .where(
      and(
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
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
