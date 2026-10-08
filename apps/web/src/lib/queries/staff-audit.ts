import {
  $fetchAuditStaff,
  $fetchStaffAudit,
} from "@/lib/functions/staff-audit";
import type { StaffAuditFilters } from "@/lib/universal/schema/staff-audit";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/**
 * The audit log grows with every staff read and action, including ones
 * taken in other tabs, so it is refetched whenever it's shown.
 */
export function staffAuditQuery(filters: StaffAuditFilters) {
  return infiniteQueryOptions({
    queryKey: ["admin", "audit", filters],
    queryFn: ({ pageParam }) =>
      $fetchStaffAudit({ data: { ...filters, cursor: pageParam } }),
    // SAFETY: cursor seed; widened for TanStack Query inference
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 0,
  });
}

export const auditStaffQuery = queryOptions({
  queryKey: ["admin", "audit", "staff"],
  queryFn: () => $fetchAuditStaff(),
});
