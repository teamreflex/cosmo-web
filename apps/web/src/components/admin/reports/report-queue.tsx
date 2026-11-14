import { LoadOlderButton, LogEmpty } from "@/components/admin/log-panel";
import { m } from "@/i18n/messages";
import { reportQueueQuery } from "@/lib/queries/reports";
import type { ReportQueueFilters } from "@/lib/universal/schema/reports";
import type { ReportStatus } from "@apollo/database/web/types";
import { IconFlag } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import ReportRow from "./report-row";

const emptyTitles = {
  open: m.admin_reports_empty_open,
  escalated: m.admin_reports_empty_escalated,
  resolved: m.admin_reports_empty_resolved,
  dismissed: m.admin_reports_empty_dismissed,
} satisfies Record<ReportStatus, () => string>;

type Props = {
  filters: ReportQueueFilters;
};

export default function ReportQueue({ filters }: Props) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(reportQueueQuery(filters));
  const rows = data.pages.flatMap((page) => page.rows);

  return (
    <section
      aria-label={m.admin_reports_title()}
      className="min-w-0 grow basis-[360px] overflow-hidden rounded-md border bg-card max-md:-mx-4 max-md:rounded-none max-md:border-x-0"
    >
      {rows.length === 0 ? (
        <LogEmpty icon={<IconFlag />} title={emptyTitles[filters.status]()} />
      ) : (
        <div className="flex flex-col">
          {rows.map((row) => (
            <ReportRow key={row.id} row={row} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center border-t border-border/60 p-3">
          <LoadOlderButton
            label={m.admin_reports_load_more()}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </div>
      )}
    </section>
  );
}
