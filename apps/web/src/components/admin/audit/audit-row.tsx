import StatusPill from "@/components/objekt/detail/status-pill";
import UserAvatar from "@/components/profile/user-avatar";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { roleLabel } from "@/lib/client/roles";
import { auditActionLabel, auditBanLength } from "@/lib/client/staff-audit";
import type {
  AdminAuditDetail,
  AdminAuditRow,
} from "@/lib/universal/staff-audit";
import { cn } from "@/lib/utils";
import type { StaffAuditAction } from "@apollo/database/web/types";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A row's place in the table's columns, which it shares through subgrid.
 */
const auditRow =
  "col-span-full grid-cols-subgrid [grid-template-areas:'who_when'_'act_act'_'target_target'] @lg:grid-rows-[auto_1fr] @lg:[grid-template-areas:'who_target_when'_'act_target_when'] @4xl:grid-rows-none @4xl:[grid-template-areas:'who_act_target_when']";

/**
 * Reads are muted, report actions plain, and actions on accounts stand out.
 */
const actionTones = {
  "report:read": "text-muted-foreground",
  "report:resolve": "text-foreground",
  "report:dismiss": "text-foreground",
  "report:escalate": "text-foreground",
  "user:ban": "text-destructive",
  "user:unban": "text-destructive",
  "user:set-role": "text-destructive",
} satisfies Record<StaffAuditAction, string>;

type Props = {
  row: AdminAuditRow;
};

/**
 * The log's table, laid out by the width of its container: stacked rows on
 * phones, two lines per row (who and action, beside target and time) on
 * tablets, and four columns once they fit. Who fits the longest staff name
 * shown, up to half the table. Phones read each row on its own, so they get
 * no column headings.
 */
export function AuditTable({ children }: { children: ReactNode }) {
  return (
    <div
      role="table"
      aria-label={m.admin_audit_title()}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 @lg:grid-cols-[fit-content(50%)_minmax(0,1fr)_auto] @4xl:grid-cols-[fit-content(50%)_180px_minmax(0,1fr)_auto]"
    >
      <div
        role="row"
        className={cn(
          "hidden border-b px-4 font-medium text-muted-foreground @lg:grid @lg:py-2 @lg:text-xs @4xl:h-10 @4xl:items-center @4xl:py-0 @4xl:text-sm",
          auditRow,
        )}
      >
        <span role="columnheader" className="[grid-area:who]">
          {m.admin_audit_who()}
        </span>
        <span role="columnheader" className="[grid-area:act]">
          {m.admin_audit_action()}
        </span>
        <span role="columnheader" className="[grid-area:target]">
          {m.admin_audit_target()}
        </span>
        <span role="columnheader" className="[grid-area:when]">
          {m.admin_audit_when()}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function AuditRow({ row }: Props) {
  return (
    <div
      role="row"
      className={cn(
        "grid items-center gap-y-1 border-b border-border/60 px-4 py-2.5 @lg:items-start @lg:py-2 @4xl:min-h-11 @4xl:items-center",
        auditRow,
      )}
    >
      <div
        role="cell"
        className="flex min-w-0 items-center gap-2 [grid-area:who]"
      >
        <UserAvatar
          username={row.staff.username}
          className="size-5.5 **:p-0.5"
        />
        <span className="truncate font-medium">@{row.staff.username}</span>
        <StatusPill tone="muted" className="font-sans">
          {roleLabel(row.staff.role)}
        </StatusPill>
      </div>

      <div
        role="cell"
        title={auditActionLabel(row.action)}
        className={cn(
          "font-mono text-xs [grid-area:act]",
          actionTones[row.action],
        )}
      >
        {row.action}
      </div>

      <div
        role="cell"
        className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 [grid-area:target]"
      >
        <AuditTarget row={row} />
      </div>

      <div
        role="cell"
        className="font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums [grid-area:when] @lg:pt-0.5 @4xl:pt-0"
      >
        <Timestamp
          date={row.createdAt}
          format={{
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }}
        />
      </div>
    </div>
  );
}

function AuditTarget({ row }: Props) {
  switch (row.target.type) {
    case "user":
      return (
        <>
          <span className="min-w-0 break-words">
            {row.target.username === null
              ? m.admin_audit_target_deleted_user()
              : m.admin_audit_target_user({ username: row.target.username })}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {shortId(row.target.id)}
          </span>
          {row.detail !== null && (
            <span className="text-xs text-muted-foreground">
              {detailNote(row.detail)}
            </span>
          )}
          {row.report !== null && (
            <Link
              to="/admin/reports"
              search={{ status: row.report.status, report: row.report.id }}
              className="text-xs text-cosmo hover:underline dark:text-cosmo-text"
            >
              {m.admin_audit_report_link({ id: shortId(row.report.id) })}
            </Link>
          )}
        </>
      );
    case "report":
      return (
        <>
          <span>{m.admin_audit_target_report()}</span>
          {row.report === null ? (
            <span className="font-mono text-xs text-muted-foreground">
              #{shortId(row.target.id)}
            </span>
          ) : (
            <Link
              to="/admin/reports"
              search={{ status: row.report.status, report: row.report.id }}
              className="font-mono text-xs text-cosmo hover:underline dark:text-cosmo-text"
            >
              #{shortId(row.report.id)}
            </Link>
          )}
          {row.action === "report:escalate" && (
            <span className="text-xs text-muted-foreground">
              {m.admin_audit_note_escalated()}
            </span>
          )}
        </>
      );
  }
}

function detailNote(detail: AdminAuditDetail) {
  switch (detail.kind) {
    case "ban":
      return auditBanLength(detail.expiresIn);
    case "set-role":
      return `${roleLabel(detail.from)} → ${roleLabel(detail.to)}`;
  }
}

/**
 * Enough of an id to tell rows apart at a glance.
 */
function shortId(id: string) {
  return id.slice(0, 8);
}
