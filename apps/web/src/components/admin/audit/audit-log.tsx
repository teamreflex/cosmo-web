import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { staffAuditQuery } from "@/lib/queries/staff-audit";
import type { StaffAuditFilters } from "@/lib/universal/schema/staff-audit";
import { IconHistory, IconLoader2 } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import AuditRow, { AuditTable } from "./audit-row";

type Props = {
  filters: StaffAuditFilters;
};

/**
 * The audit table. Its layout follows the panel's own width, since the
 * admin sidebar takes a varying share of the screen.
 */
export default function AuditLog({ filters }: Props) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(staffAuditQuery(filters));
  const rows = data.pages.flatMap((page) => page.rows);
  const numbers = new Intl.NumberFormat(getLocale());

  return (
    <div className="@container overflow-hidden rounded-md border bg-card text-sm max-md:-mx-4 max-md:rounded-none max-md:border-x-0">
      {rows.length === 0 ? (
        <Empty className="p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconHistory />
            </EmptyMedia>
            <EmptyTitle className="text-base">
              {filters.staffId === undefined && filters.action === undefined
                ? m.admin_audit_empty()
                : m.admin_audit_empty_filtered()}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <AuditTable>
            {rows.map((row) => (
              <AuditRow key={row.id} row={row} />
            ))}
          </AuditTable>

          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {m.admin_audit_showing({
                loaded: numbers.format(rows.length),
                total: numbers.format(data.pages[0]?.total ?? rows.length),
              })}
            </span>
            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                <span>{m.admin_audit_older()}</span>
                {isFetchingNextPage && <IconLoader2 className="animate-spin" />}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
