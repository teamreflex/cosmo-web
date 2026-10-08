import {
  $fetchMyReport,
  $fetchReport,
  $fetchReportCounts,
  $fetchReportQueue,
} from "@/lib/functions/reports";
import type {
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

export const reportCountsQuery = queryOptions({
  queryKey: ["admin", "reports", "counts"],
  queryFn: () => $fetchReportCounts(),
});

export function reportQueueQuery(filters: ReportQueueFilters) {
  return infiniteQueryOptions({
    queryKey: ["admin", "reports", "queue", filters],
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
    queryKey: ["admin", "reports", "detail", id],
    queryFn: () => $fetchReport({ data: { id } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
