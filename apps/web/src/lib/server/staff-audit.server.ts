import { db } from "@/lib/server/db";
import type { DbOrTx } from "@/lib/server/db";
import {
  fetchStaffUsernames,
  staffUsername,
} from "@/lib/server/staff-users.server";
import type { StaffAuditQueryInput } from "@/lib/universal/schema/staff-audit";
import type {
  AdminAuditDetail,
  AdminAuditRow,
  AdminAuditTarget,
  AuditStaffMember,
} from "@/lib/universal/staff-audit";
import { parseRole } from "@apollo/auth";
import { staffAudit } from "@apollo/database/web/schema";
import type {
  StaffAuditDetail,
  StaffAuditTargetType,
} from "@apollo/database/web/types";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

const AUDIT_PAGE_SIZE = 50;

type ReportAuditEntry = {
  staffId: string;
  action:
    | "report:read"
    | "report:resolve"
    | "report:dismiss"
    | "report:escalate";
  reportId: string;
};

type BanAuditEntry = {
  staffId: string;
  action: "user:ban";
  userId: string;
  reportId: string | null;
  detail: Extract<StaffAuditDetail, { kind: "ban" }>;
};

type UnbanAuditEntry = {
  staffId: string;
  action: "user:unban";
  userId: string;
};

type SetRoleAuditEntry = {
  staffId: string;
  action: "user:set-role";
  userId: string;
  detail: Extract<StaffAuditDetail, { kind: "set-role" }>;
};

export type StaffAuditEntry =
  | ReportAuditEntry
  | BanAuditEntry
  | UnbanAuditEntry
  | SetRoleAuditEntry;

function toAuditRow(entry: StaffAuditEntry): typeof staffAudit.$inferInsert {
  switch (entry.action) {
    case "report:read":
    case "report:resolve":
    case "report:dismiss":
    case "report:escalate":
      return {
        staffId: entry.staffId,
        action: entry.action,
        targetType: "report",
        targetId: entry.reportId,
        reportId: entry.reportId,
      };
    case "user:ban":
      return {
        staffId: entry.staffId,
        action: entry.action,
        targetType: "user",
        targetId: entry.userId,
        reportId: entry.reportId,
        detail: entry.detail,
      };
    case "user:unban":
      return {
        staffId: entry.staffId,
        action: entry.action,
        targetType: "user",
        targetId: entry.userId,
      };
    case "user:set-role":
      return {
        staffId: entry.staffId,
        action: entry.action,
        targetType: "user",
        targetId: entry.userId,
        detail: entry.detail,
      };
  }
}

/**
 * Append a staff read or action to the audit log.
 */
export async function recordStaffAudit(
  executor: DbOrTx,
  entry: StaffAuditEntry,
) {
  /**
   * Reads are logged once per staff visit: SSR, hydration and query
   * invalidation would otherwise log the same report several times.
   */
  if (entry.action === "report:read") {
    const recent = await executor.$count(
      staffAudit,
      and(
        eq(staffAudit.staffId, entry.staffId),
        eq(staffAudit.action, entry.action),
        eq(staffAudit.targetType, "report"),
        eq(staffAudit.targetId, entry.reportId),
        gt(staffAudit.createdAt, sql`now() - interval '10 minutes'`),
      ),
    );
    if (recent > 0) {
      return;
    }
  }

  await executor.insert(staffAudit).values(toAuditRow(entry));
}

/**
 * One page of the audit log, newest first, plus how many rows match the
 * filters in total.
 */
export async function fetchStaffAudit(input: StaffAuditQueryInput) {
  const [rows, total] = await Promise.all([
    db.query.staffAudit.findMany({
      // drizzle rc.5 throws on explicit undefined filter values, so optional
      // filters are only present when set
      where: {
        ...(input.staffId && { staffId: input.staffId }),
        ...(input.action && { action: input.action }),
        ...(input.cursor !== undefined && { id: { lt: input.cursor } }),
      },
      orderBy: { id: "desc" },
      limit: AUDIT_PAGE_SIZE,
      with: {
        staff: {
          columns: {
            id: true,
            name: true,
            username: true,
            displayUsername: true,
            role: true,
          },
        },
      },
    }),
    db.$count(
      staffAudit,
      and(
        input.staffId ? eq(staffAudit.staffId, input.staffId) : undefined,
        input.action ? eq(staffAudit.action, input.action) : undefined,
      ),
    ),
  ]);

  const usernames = await fetchStaffUsernames(
    rows.filter((row) => row.targetType === "user").map((row) => row.targetId),
  );

  const last = rows.at(-1);
  return {
    rows: rows.map((row): AdminAuditRow => ({
      id: row.id,
      createdAt: row.createdAt,
      action: row.action,
      staff: {
        id: row.staff.id,
        username: staffUsername(row.staff),
        role: parseRole(row.staff.role),
      },
      reportId: row.reportId,
      detail: row.detail === null ? null : toAuditDetail(row.detail),
      target: toAuditTarget(row.targetType, row.targetId, usernames),
    })),
    nextCursor: rows.length === AUDIT_PAGE_SIZE && last ? last.id : undefined,
    total,
  };
}

function toAuditTarget(
  targetType: StaffAuditTargetType,
  targetId: string,
  usernames: Map<string, string>,
): AdminAuditTarget {
  switch (targetType) {
    case "user":
      return {
        type: "user",
        id: targetId,
        username: usernames.get(targetId) ?? null,
      };
    case "report":
      return { type: "report", id: targetId };
  }
}

function toAuditDetail(detail: StaffAuditDetail): AdminAuditDetail {
  switch (detail.kind) {
    case "ban":
      return { kind: "ban", expiresIn: detail.expiresIn };
    case "set-role":
      return {
        kind: "set-role",
        from: parseRole(detail.from),
        to: parseRole(detail.to),
      };
  }
}

/**
 * Everyone with at least one audit row, for the log's Staff filter. Demoted
 * staff stay listed because their rows remain.
 */
export async function fetchAuditStaff(): Promise<AuditStaffMember[]> {
  const staff = await db.query.user.findMany({
    where: {
      RAW: (t) =>
        inArray(
          t.id,
          db.selectDistinct({ id: staffAudit.staffId }).from(staffAudit),
        ),
    },
    columns: { id: true, name: true, username: true, displayUsername: true },
  });

  return staff
    .map((user) => ({ id: user.id, username: staffUsername(user) }))
    .toSorted((a, b) => a.username.localeCompare(b.username));
}
