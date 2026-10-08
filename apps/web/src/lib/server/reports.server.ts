import { db } from "@/lib/server/db";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { openReportStatuses } from "@/lib/universal/reports";
import type {
  AdminReportDetail,
  AdminReportDetailTarget,
  AdminReportRow,
  AdminReportRowTarget,
  ReportOutcome,
} from "@/lib/universal/reports";
import type { ReportQueueInput } from "@/lib/universal/schema/reports";
import { parseRole } from "@apollo/auth";
import { reports } from "@apollo/database/web/schema";
import type {
  ReportStatus,
  ReportTargetType,
} from "@apollo/database/web/types";
import { and, eq, inArray, ne, sql } from "drizzle-orm";

const QUEUE_PAGE_SIZE = 30;

type NamedUser = {
  name: string;
  username: string | null;
  displayUsername: string | null;
};

/**
 * The name staff see for an account: the username as the user typed it,
 * falling back to the account name for users who never set one.
 */
function staffUsername(user: NamedUser) {
  return user.displayUsername ?? user.username ?? user.name;
}

/**
 * One page of the staff queue, newest first. The cursor carries `created_at`
 * as Postgres text, which keeps the microseconds a JS Date would drop.
 */
export async function fetchReportQueue(input: ReportQueueInput) {
  const after = decodeQueueCursor(input.cursor);
  // drizzle rc.5 throws on explicit undefined filter values, so optional
  // filters are only present when set
  const rows = await db.query.reports.findMany({
    where: {
      status: input.status,
      ...(input.targetType && { targetType: input.targetType }),
      ...(after && {
        RAW: (t) =>
          sql`(${t.createdAt}, ${t.id}) < (${after.at}::timestamp, ${after.id}::uuid)`,
      }),
    },
    columns: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      status: true,
      createdAt: true,
    },
    extras: {
      cursorAt: (t) => sql<string>`${t.createdAt}::text`,
    },
    orderBy: { createdAt: "desc", id: "desc" },
    limit: QUEUE_PAGE_SIZE,
    with: {
      reporter: {
        columns: { name: true, username: true, displayUsername: true },
      },
    },
  });

  const userIds = rows
    .filter((row) => row.targetType === "user")
    .map((row) => row.targetId);
  const users =
    userIds.length === 0
      ? []
      : await db.query.user.findMany({
          where: { id: { in: userIds } },
          columns: {
            id: true,
            name: true,
            username: true,
            displayUsername: true,
          },
        });
  const usersById = new Map(users.map((user) => [user.id, user]));

  const last = rows.at(-1);
  return {
    rows: rows.map((row): AdminReportRow => ({
      id: row.id,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt,
      reporter: { username: staffUsername(row.reporter) },
      target: toRowTarget(row.targetType, usersById.get(row.targetId)),
    })),
    nextCursor:
      rows.length === QUEUE_PAGE_SIZE && last
        ? encodeQueueCursor(last.cursorAt, last.id)
        : undefined,
  };
}

function toRowTarget(
  targetType: ReportTargetType,
  user: (NamedUser & { id: string }) | undefined,
): AdminReportRowTarget {
  switch (targetType) {
    case "user":
      return {
        type: "user",
        user: user ? { id: user.id, username: staffUsername(user) } : null,
      };
    case "message":
    case "listing":
    case "feedback":
    case "trade":
      throw new Error(`Reports on ${targetType} targets aren't supported yet`);
  }
}

/**
 * A report with everything staff need to act on it. Throws
 * `report_not_found` for an unknown id.
 */
export async function fetchReportDetail(
  id: string,
): Promise<AdminReportDetail> {
  const report = await db.query.reports.findFirst({
    where: { id },
    with: {
      reporter: {
        columns: { name: true, username: true, displayUsername: true },
      },
      resolver: {
        columns: { name: true, username: true, displayUsername: true },
      },
    },
  });

  if (!report) {
    throw new ExpectedError("report_not_found");
  }

  const [target, otherOpenCount] = await Promise.all([
    fetchDetailTarget(report.targetType, report.targetId),
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
    reporter: { username: staffUsername(report.reporter) },
    otherOpenCount,
    target,
  };
}

async function fetchDetailTarget(
  targetType: ReportTargetType,
  targetId: string,
): Promise<AdminReportDetailTarget> {
  switch (targetType) {
    case "user": {
      const user = await db.query.user.findFirst({
        where: { id: targetId },
        columns: {
          id: true,
          name: true,
          username: true,
          displayUsername: true,
          image: true,
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

      // expired bans stay flagged until the user's next sign-in clears them
      const banActive =
        user.banned &&
        (user.banExpires === null || user.banExpires > new Date());

      return {
        type: "user",
        user: {
          id: user.id,
          username: staffUsername(user),
          image: user.image,
          role: parseRole(user.role),
          ban: banActive ? { until: user.banExpires } : null,
          profile: user.cosmoAccount?.username ?? null,
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
        resolver: report.resolver
          ? { username: staffUsername(report.resolver) }
          : null,
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
 * `report_status_changed` instead of overwriting another staff member.
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
      .where(and(eq(reports.id, id), inArray(reports.status, from)))
      .returning({ id: reports.id });

    if (!updated) {
      const exists = await tx.$count(reports, eq(reports.id, id));
      throw new ExpectedError(
        exists > 0 ? "report_status_changed" : "report_not_found",
      );
    }

    await recordStaffAudit(tx, { staffId, action, reportId: id });
  });
}

/**
 * Decode a base64 queue cursor into `created_at` text and id.
 */
function decodeQueueCursor(cursor: string | undefined) {
  if (!cursor) return null;

  const [at, id] = Buffer.from(cursor, "base64").toString().split("|");
  return at && id ? { at, id } : null;
}

/**
 * Encode `created_at` text and id into a base64 queue cursor.
 */
function encodeQueueCursor(at: string, id: string) {
  return Buffer.from(`${at}|${id}`).toString("base64");
}
