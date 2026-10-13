import StaffUserName from "@/components/admin/staff-user-name";
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
import { staffUserText } from "@/lib/universal/staff-users";
import { cn } from "@/lib/utils";
import type { StaffAuditAction } from "@apollo/database/web/types";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A row's place in the table's columns, which it shares through subgrid.
 */
const auditRow =
  "col-span-full grid-cols-subgrid [grid-template-areas:'who_when'_'act_act'_'target_target'] @md:[grid-template-areas:'who_who_when'_'act_target_target'] @lg:grid-rows-[auto_1fr] @lg:[grid-template-areas:'who_target_when'_'act_target_when'] @4xl:grid-rows-none @4xl:[grid-template-areas:'who_act_target_when']";

/**
 * Reads are muted, report actions and content edits plain, and actions that
 * change who has access stand out.
 */
const actionTones = {
  "report:read": "text-muted-foreground",
  "report:resolve": "text-foreground",
  "report:dismiss": "text-foreground",
  "report:escalate": "text-foreground",
  "user:ban": "text-destructive",
  "user:unban": "text-destructive",
  "user:set-role": "text-destructive",
  "api-key:create": "text-destructive",
  "api-key:update": "text-destructive",
  "api-key:delete": "text-destructive",
  "metadata:update": "text-foreground",
  "trade:dispute": "text-foreground",
  "trade:complete": "text-foreground",
  "trade:cancel": "text-foreground",
  "trade:extend": "text-foreground",
} satisfies Record<StaffAuditAction, string>;

type Props = {
  row: AdminAuditRow;
};

/**
 * The log's table, laid out by the width of its container: stacked rows on
 * phones, then two lines per row. Narrow tablets put who and time over
 * action and target; wider ones put who and action beside target and time,
 * sizing who to the longest staff name shown, up to half the table. Four
 * columns follow once they fit. Phones read each row on its own, so they get
 * no column headings.
 */
export function AuditTable({ children }: { children: ReactNode }) {
  return (
    <div
      role="table"
      aria-label={m.admin_audit_title()}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 @md:grid-cols-[auto_minmax(0,1fr)_auto] @lg:grid-cols-[fit-content(50%)_minmax(0,1fr)_auto] @4xl:grid-cols-[fit-content(50%)_180px_minmax(0,1fr)_auto]"
    >
      <div
        role="row"
        className={cn(
          "hidden border-b px-4 font-medium text-muted-foreground @md:grid @md:py-2 @md:text-xs @4xl:h-10 @4xl:items-center @4xl:py-0 @4xl:text-sm",
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
        "grid items-center gap-y-1 border-b border-border/60 px-4 py-2.5 @md:items-start @md:py-2 @4xl:min-h-11 @4xl:items-center",
        auditRow,
      )}
    >
      <div
        role="cell"
        className="flex min-w-0 items-center gap-2 [grid-area:who]"
      >
        {row.staff === null ? (
          <>
            <UserAvatar deleted className="size-5.5" />
            <span className="truncate font-medium text-muted-foreground">
              {m.admin_audit_target_deleted_user()}
            </span>
          </>
        ) : (
          <>
            <UserAvatar
              username={row.staff.username}
              className="size-5.5 **:p-0.5"
            />
            <StaffUserName user={row.staff} className="font-medium" />
            <StatusPill tone="muted" className="font-sans">
              {roleLabel(row.staff.role)}
            </StatusPill>
          </>
        )}
      </div>

      <div
        role="cell"
        title={auditActionLabel(row.action)}
        className={cn(
          "font-mono text-xs [grid-area:act] @md:pt-0.5 @lg:pt-0",
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
        className="font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums [grid-area:when] @md:pt-0.5 @4xl:pt-0"
      >
        <Timestamp date={row.createdAt} format={auditTimeFormat} />
      </div>
    </div>
  );
}

// a day and a 24-hour time, short enough for the row's last column
const auditTimeFormat = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
} satisfies Intl.DateTimeFormatOptions;

function AuditTarget({ row }: Props) {
  switch (row.target.type) {
    case "user": {
      const { user } = row.target;
      return (
        <>
          <span className="min-w-0 break-words">
            {user === null ? (
              m.admin_audit_target_deleted_user()
            ) : (
              <ParaglideMessage
                message={m.admin_audit_target_user}
                inputs={{ username: staffUserText(user) }}
                markup={{ user: () => <StaffUserName user={user} /> }}
              />
            )}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {shortId(row.target.id)}
          </span>
          {row.detail !== null && (
            <span className="text-xs text-muted-foreground">
              {detailNote(row.detail)}
            </span>
          )}
          {row.report !== null && <ReportLink report={row.report} />}
        </>
      );
    }
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
    case "api-key": {
      const { owner } = row.target;
      return (
        <>
          <span className="min-w-0 break-words">
            {row.target.name === null
              ? m.admin_audit_target_api_key_unnamed()
              : m.admin_audit_target_api_key({ name: row.target.name })}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {shortId(row.target.id)}
          </span>
          <span className="text-xs text-muted-foreground">
            {owner === null ? (
              m.admin_audit_note_api_key_owner_deleted()
            ) : (
              <ParaglideMessage
                message={m.admin_audit_note_api_key_owner}
                inputs={{ username: staffUserText(owner) }}
                markup={{ user: () => <StaffUserName user={owner} /> }}
              />
            )}
          </span>
          {row.action === "api-key:update" && (
            <span className="text-xs text-muted-foreground">
              {row.target.enabled
                ? m.admin_api_key_status_enabled()
                : m.admin_api_key_status_disabled()}
            </span>
          )}
        </>
      );
    }
    case "collection":
      return (
        <>
          <span>{m.admin_audit_target_collection()}</span>
          <span className="min-w-0 font-mono text-xs wrap-anywhere text-muted-foreground">
            {row.target.slug}
          </span>
        </>
      );
    case "trade":
      return (
        <>
          <span>{m.admin_audit_target_trade()}</span>
          <Link
            to="/trade/$id"
            params={{ id: row.target.id }}
            className="font-mono text-xs text-cosmo hover:underline dark:text-cosmo-text"
          >
            {shortId(row.target.id)}
          </Link>
          {row.detail !== null && (
            <span className="text-xs text-muted-foreground">
              {detailNote(row.detail)}
            </span>
          )}
          {row.report !== null && <ReportLink report={row.report} />}
        </>
      );
  }
}

/**
 * The report a user or trade action was taken from, opened in the queue.
 */
function ReportLink({
  report,
}: {
  report: NonNullable<AdminAuditRow["report"]>;
}) {
  return (
    <Link
      to="/admin/reports"
      search={{ status: report.status, report: report.id }}
      className="text-xs text-cosmo hover:underline dark:text-cosmo-text"
    >
      {m.admin_audit_report_link({ id: shortId(report.id) })}
    </Link>
  );
}

function detailNote(detail: AdminAuditDetail) {
  switch (detail.kind) {
    case "ban":
      return auditBanLength(detail.expiresIn);
    case "set-role":
      return `${roleLabel(detail.from)} → ${roleLabel(detail.to)}`;
    case "trade-extend":
      return (
        <>
          {m.admin_audit_note_trade_extend({ hours: detail.hours })}
          {" → "}
          <Timestamp date={detail.deadlineAt} format={auditTimeFormat} />
        </>
      );
  }
}

/**
 * Enough of an id to tell rows apart at a glance.
 */
function shortId(id: string) {
  return id.slice(0, 8);
}
