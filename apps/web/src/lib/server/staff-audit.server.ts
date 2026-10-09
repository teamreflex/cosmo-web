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

type ApiKeyAuditEntry = {
  staffId: string;
  action: "api-key:create" | "api-key:update" | "api-key:delete";
  apiKeyId: string;
  detail: Extract<StaffAuditDetail, { kind: "api-key" }>;
};

type MetadataAuditEntry = {
  staffId: string;
  action: "metadata:update";
  slug: string;
};

export type StaffAuditEntry =
  | ReportAuditEntry
  | BanAuditEntry
  | UnbanAuditEntry
  | SetRoleAuditEntry
  | ApiKeyAuditEntry
  | MetadataAuditEntry;

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
    case "api-key:create":
    case "api-key:update":
    case "api-key:delete":
      return {
        staffId: entry.staffId,
        action: entry.action,
        targetType: "api-key",
        targetId: entry.apiKeyId,
        detail: entry.detail,
      };
    case "metadata:update":
      return {
        staffId: entry.staffId,
        action: entry.action,
        targetType: "collection",
        targetId: entry.slug,
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
      /**
       * drizzle rc.5 throws on explicit undefined filter values, so optional
       * filters are only present when set
       */
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
            name: true,
            username: true,
            displayUsername: true,
            role: true,
          },
        },
        report: { columns: { id: true, status: true } },
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
    rows.flatMap((row) => {
      if (row.targetType === "user") {
        return [row.targetId];
      }
      return row.detail?.kind === "api-key" ? [row.detail.ownerId] : [];
    }),
  );

  const last = rows.at(-1);
  return {
    rows: rows.map((row): AdminAuditRow => ({
      id: row.id,
      createdAt: row.createdAt,
      action: row.action,
      staff: {
        username: staffUsername(row.staff),
        role: parseRole(row.staff.role),
      },
      report: row.report,
      detail: row.detail === null ? null : toAuditDetail(row.detail),
      target: toAuditTarget(row, usernames),
    })),
    nextCursor: rows.length === AUDIT_PAGE_SIZE && last ? last.id : undefined,
    total,
  };
}

function toAuditTarget(
  row: {
    targetType: StaffAuditTargetType;
    targetId: string;
    detail: StaffAuditDetail | null;
  },
  usernames: Map<string, string>,
): AdminAuditTarget {
  switch (row.targetType) {
    case "user":
      return {
        type: "user",
        id: row.targetId,
        username: usernames.get(row.targetId) ?? null,
      };
    case "report":
      return { type: "report", id: row.targetId };
    case "api-key":
      // recordStaffAudit always stores the key's detail with these rows
      if (row.detail?.kind !== "api-key") {
        throw new Error(`Audit row on API key ${row.targetId} has no detail`);
      }
      return {
        type: "api-key",
        id: row.targetId,
        name: row.detail.name,
        owner: usernames.get(row.detail.ownerId) ?? null,
        enabled: row.detail.enabled,
      };
    case "collection":
      return { type: "collection", slug: row.targetId };
  }
}

/**
 * API key details are shown as the target instead.
 */
function toAuditDetail(detail: StaffAuditDetail): AdminAuditDetail | null {
  switch (detail.kind) {
    case "ban":
      return { kind: "ban", expiresIn: detail.expiresIn };
    case "set-role":
      return {
        kind: "set-role",
        from: parseRole(detail.from),
        to: parseRole(detail.to),
      };
    case "api-key":
      return null;
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
