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
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 0,
  });
}

export const auditStaffQuery = queryOptions({
  queryKey: ["admin", "audit", "staff"],
  queryFn: () => $fetchAuditStaff(),
});

/**
 * The first page has no cursor. Typed as the cursor union so the query
 * infers its page param from it.
 */
const firstPage: number | undefined = undefined;
