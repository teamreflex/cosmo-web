import LogPanel from "@/components/admin/log-panel";
import { m } from "@/i18n/messages";
import { staffAuditQuery } from "@/lib/queries/staff-audit";
import type { StaffAuditFilters } from "@/lib/universal/schema/staff-audit";
import { IconHistory } from "@tabler/icons-react";
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

  return (
    <LogPanel
      emptyIcon={<IconHistory />}
      emptyTitle={
        filters.staffId === undefined && filters.action === undefined
          ? m.admin_audit_empty()
          : m.admin_audit_empty_filtered()
      }
      loaded={rows.length}
      total={data.pages[0]?.total ?? rows.length}
      showing={m.admin_audit_showing}
      olderLabel={m.admin_audit_older()}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    >
      <AuditTable>
        {rows.map((row) => (
          <AuditRow key={row.id} row={row} />
        ))}
      </AuditTable>
    </LogPanel>
  );
}
