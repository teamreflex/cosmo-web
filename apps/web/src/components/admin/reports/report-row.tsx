import StaffUserName from "@/components/admin/staff-user-name";
import StatusPill from "@/components/objekt/detail/status-pill";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { reportReasonLabel, reportTargetTypeLabel } from "@/lib/client/reports";
import type { AdminReportRow } from "@/lib/universal/reports";
import { type StaffUser, staffUserText } from "@/lib/universal/staff-users";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

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
        <StatusPill tone="muted" className="shrink-0 font-sans">
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
        <RowSummary row={row} />
      </span>
    </Link>
  );
}

function RowSummary({ row }: Props) {
  const reporter = nameInput(row.reporter);
  const { target } = row;

  switch (target.type) {
    case "user": {
      const user = nameInput(target.user);
      return (
        <ParaglideMessage
          message={m.admin_reports_row_summary}
          inputs={{ target: user.text, reporter: reporter.text }}
          markup={{ target: user.markup, reporter: reporter.markup }}
        />
      );
    }
    case "trade": {
      const { trade } = target;
      if (trade === null) {
        return (
          <ParaglideMessage
            message={m.admin_reports_row_trade_gone}
            inputs={{ reporter: reporter.text }}
            markup={{ reporter: reporter.markup }}
          />
        );
      }
      const from = nameInput(trade.from);
      const to = nameInput(trade.to);
      return (
        <ParaglideMessage
          message={m.admin_reports_row_trade_summary}
          inputs={{
            id: trade.id.slice(0, 8),
            from: from.text,
            to: to.text,
            reporter: reporter.text,
          }}
          markup={{
            from: from.markup,
            to: to.markup,
            reporter: reporter.markup,
          }}
        />
      );
    }
    case "message": {
      const { message } = target;
      if (message === null) {
        return (
          <ParaglideMessage
            message={m.admin_reports_row_message_gone}
            inputs={{ reporter: reporter.text }}
            markup={{ reporter: reporter.markup }}
          />
        );
      }
      const sender = nameInput(message.sender);
      return (
        <ParaglideMessage
          message={m.admin_reports_row_message_summary}
          inputs={{
            sender: sender.text,
            id: message.tradeId.slice(0, 8),
            reporter: reporter.text,
          }}
          markup={{ sender: sender.markup, reporter: reporter.markup }}
        />
      );
    }
  }
}

/**
 * A user named in a row summary, as message text and as the markup that
 * renders it, cut short with the full name on hover since a COSMO username
 * can be a 42-character address; "Deleted user" once their account is gone.
 */
function nameInput(user: StaffUser | null) {
  const text =
    user === null ? m.admin_reports_deleted_user() : staffUserText(user);
  return {
    text,
    markup: ({ children }: { children?: ReactNode }) =>
      user === null ? (
        children
      ) : (
        <span title={text} className="inline-flex max-w-40 align-bottom">
          <StaffUserName user={user} link={false} />
        </span>
      ),
  };
}
