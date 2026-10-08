import type { DbOrTx } from "@/lib/server/db";
import { staffAudit } from "@apollo/database/web/schema";
import type { StaffAuditDetail } from "@apollo/database/web/types";
import { and, eq, gt, sql } from "drizzle-orm";

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
