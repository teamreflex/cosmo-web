import {
  $fetchMyReport,
  $fetchReport,
  $fetchReportCounts,
  $fetchReportQueue,
} from "@/lib/functions/reports";
import type {
  ReportCountsInput,
  ReportQueueFilters,
  ReportTarget,
} from "@/lib/universal/schema/reports";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/**
 * The signed-in user's open report on a target, if any.
 */
export function myReportQuery(target: ReportTarget) {
  return queryOptions({
    queryKey: ["my-report", target.targetType, target.targetId],
    queryFn: () =>
      $fetchMyReport({
        data: { targetType: target.targetType, targetId: target.targetId },
      }),
  });
}

/**
 * Matches every staff report query (counts, queue pages and details), which
 * report actions and bans all invalidate together.
 */
export const adminReportsQueryFilter = { queryKey: ["admin", "reports"] };

/**
 * Open and escalated counts; the queue's tabs pass its Type filter, and the
 * sidebar badge counts every type.
 */
export function reportCountsQuery(filters: ReportCountsInput) {
  return queryOptions({
    queryKey: [...adminReportsQueryFilter.queryKey, "counts", filters],
    queryFn: () => $fetchReportCounts({ data: filters }),
  });
}

export function reportQueueQuery(filters: ReportQueueFilters) {
  return infiniteQueryOptions({
    queryKey: [...adminReportsQueryFilter.queryKey, "queue", filters],
    queryFn: ({ pageParam }) =>
      $fetchReportQueue({ data: { ...filters, cursor: pageParam } }),
    // SAFETY: cursor seed; widened for TanStack Query inference
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/**
 * A report's detail. Every fetch writes an audited read, so it isn't
 * refetched on focus; actions invalidate it.
 */
export function reportDetailQuery(id: string) {
  return queryOptions({
    queryKey: [...adminReportsQueryFilter.queryKey, "detail", id],
    queryFn: () => $fetchReport({ data: { id } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
