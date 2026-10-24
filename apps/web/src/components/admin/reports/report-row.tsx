import StaffUserName from "@/components/admin/staff-user-name";
import StatusPill from "@/components/objekt/detail/status-pill";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { reportReasonLabel, reportTargetTypeLabel } from "@/lib/client/reports";
import type { AdminReportRow } from "@/lib/universal/reports";
import { staffUserText } from "@/lib/universal/staff-users";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

type Props = {
  row: AdminReportRow;
};

/**
 * A queue row; it opens the report beside the queue (below it on narrower
 * screens), and the router marks the open one active.
 */
export default function ReportRow({ row }: Props) {
  return (
    <Link
      from="/admin/reports"
      search={(prev) => ({ ...prev, report: row.id })}
      resetScroll={false}
      className="flex flex-col gap-1.5 border-b border-border/60 px-3.5 py-3 transition-colors last:border-b-0 hover:bg-muted/30 data-[status=active]:bg-muted/50 data-[status=active]:shadow-[inset_3px_0_0_var(--color-destructive)] max-md:px-4"
    >
      <span className="flex min-w-0 items-center gap-2">
        <StatusPill tone="muted" className="font-sans">
          {reportTargetTypeLabel(row.target.type)}
        </StatusPill>
        <span className="truncate text-sm font-semibold">
          {reportReasonLabel(row.reason)}
        </span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
          <Timestamp date={row.createdAt} relative="narrow" />
        </span>
        <IconChevronRight className="size-4 shrink-0 text-muted-foreground md:hidden" />
      </span>
      <span className="text-sm text-muted-foreground">
        {/* the row is a link, so the names inside it aren't */}
        <ParaglideMessage
          message={m.admin_reports_row_summary}
          inputs={{
            target:
              row.target.user === null
                ? m.admin_reports_deleted_user()
                : staffUserText(row.target.user),
            reporter:
              row.reporter === null
                ? m.admin_reports_deleted_user()
                : staffUserText(row.reporter),
          }}
          markup={{
            target: ({ children }) =>
              row.target.user === null ? (
                children
              ) : (
                <StaffUserName user={row.target.user} link={false} />
              ),
            reporter: ({ children }) =>
              row.reporter === null ? (
                children
              ) : (
                <StaffUserName user={row.reporter} link={false} />
              ),
          }}
        />
      </span>
    </Link>
  );
}
