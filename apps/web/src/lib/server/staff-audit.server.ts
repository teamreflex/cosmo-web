import { db } from "@/lib/server/db";
import type { DbOrTx } from "@/lib/server/db";
import {
  fetchStaffUsers,
  staffUser,
  staffUserFields,
} from "@/lib/server/staff-users.server";
import type { StaffUserRow } from "@/lib/server/staff-users.server";
import type { StaffAuditQueryInput } from "@/lib/universal/schema/staff-audit";
import type {
  AdminAuditDetail,
  AdminAuditRow,
  AdminAuditTarget,
  AuditStaffMember,
} from "@/lib/universal/staff-audit";
import { parseRole } from "@apollo/auth";
import { user } from "@apollo/database/auth";
import { cosmoAccounts, staffAudit } from "@apollo/database/web/schema";
import type {
  StaffAuditDetail,
  StaffAuditTargetType,
} from "@apollo/database/web/types";
import { and, EmptyFilter, eq, gt, sql } from "drizzle-orm";

const AUDIT_PAGE_SIZE = 50;

type ReportReadAuditEntry = {
  staffId: string;
  action: "report:read";
  reportId: string;
};

type ReportAuditEntry = {
  staffId: string;
  action: "report:resolve" | "report:dismiss" | "report:escalate";
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

/**
 * Entries written without checking for a recent duplicate, so several can go
 * in one insert.
 */
type UndeduplicatedAuditEntry =
  | ReportAuditEntry
  | BanAuditEntry
  | UnbanAuditEntry
  | SetRoleAuditEntry
  | ApiKeyAuditEntry
  | MetadataAuditEntry;

export type StaffAuditEntry = ReportReadAuditEntry | UndeduplicatedAuditEntry;

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
 * Append a staff read or action to the audit log, or several undeduplicated
 * entries in one insert.
 */
export async function recordStaffAudit(
  executor: DbOrTx,
  entries: StaffAuditEntry | UndeduplicatedAuditEntry[],
) {
  /**
   * Reads are logged once per staff visit: SSR, hydration and query
   * invalidation would otherwise log the same report several times.
   */
  if (!Array.isArray(entries) && entries.action === "report:read") {
    const recent = await executor.$count(
      staffAudit,
      and(
        eq(staffAudit.staffId, entries.staffId),
        eq(staffAudit.action, entries.action),
        eq(staffAudit.targetType, "report"),
        eq(staffAudit.targetId, entries.reportId),
        gt(staffAudit.createdAt, sql`now() - interval '10 minutes'`),
      ),
    );
    if (recent > 0) {
      return;
    }
  }

  const rows = (Array.isArray(entries) ? entries : [entries]).map(toAuditRow);
  // values() throws on an empty list, as when a ban finds no open reports
  if (rows.length > 0) {
    await executor.insert(staffAudit).values(rows);
  }
}

/**
 * One page of the audit log, newest first. The first page also carries how
 * many rows match the filters in total, the only page the client reads it
 * from.
 */
export async function fetchStaffAudit(input: StaffAuditQueryInput) {
  const rows = await db.query.staffAudit.findMany({
    where: {
      staffId: input.staffId ?? EmptyFilter,
      action: input.action ?? EmptyFilter,
      id: { lt: input.cursor ?? EmptyFilter },
    },
    orderBy: { id: "desc" },
    limit: AUDIT_PAGE_SIZE,
    with: {
      staff: {
        columns: { ...staffUserFields.columns, role: true },
        with: staffUserFields.with,
      },
      report: { columns: { id: true, status: true } },
    },
  });
  const total =
    input.cursor === undefined
      ? await db.$count(
          staffAudit,
          and(
            input.staffId ? eq(staffAudit.staffId, input.staffId) : undefined,
            input.action ? eq(staffAudit.action, input.action) : undefined,
          ),
        )
      : undefined;

  const users = await fetchStaffUsers(
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
      staff:
        row.staff === null
          ? null
          : { ...staffUser(row.staff), role: row.staff.role },
      report: row.report,
      detail: row.detail === null ? null : toAuditDetail(row.detail),
      target: toAuditTarget(row, users),
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
  users: Map<string, StaffUserRow>,
): AdminAuditTarget {
  switch (row.targetType) {
    case "user":
      return {
        type: "user",
        id: row.targetId,
        user: staffUser(users.get(row.targetId) ?? null),
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
        owner: staffUser(users.get(row.detail.ownerId) ?? null),
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
 * and deleted staff stay listed because their rows remain; deleted staff
 * have no name and sort last.
 */
export async function fetchAuditStaff(): Promise<AuditStaffMember[]> {
  const staffIds = db
    .selectDistinct({ id: staffAudit.staffId })
    .from(staffAudit)
    .as("audit_staff");
  const staff = await db
    .select({
      id: staffIds.id,
      user: {
        name: user.name,
        username: user.username,
        displayUsername: user.displayUsername,
      },
      cosmoAccount: { username: cosmoAccounts.username },
    })
    .from(staffIds)
    .leftJoin(user, eq(user.id, staffIds.id))
    .leftJoin(cosmoAccounts, eq(cosmoAccounts.userId, user.id));

  return staff
    .map((row) => ({
      id: row.id,
      user:
        row.user === null
          ? null
          : staffUser({ ...row.user, cosmoAccount: row.cosmoAccount }),
    }))
    .toSorted((a, b) =>
      a.user === null || b.user === null
        ? Number(a.user === null) - Number(b.user === null)
        : a.user.username.localeCompare(b.user.username),
    );
}
