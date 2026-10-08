import { SidebarMenuBadge } from "@/components/ui/sidebar";
import { reportCountsQuery } from "@/lib/queries/reports";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * The open report count beside the sidebar's Reports item.
 */
export default function ReportsBadge() {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <OpenCount />
      </Suspense>
    </ErrorBoundary>
  );
}

function OpenCount() {
  const { data } = useSuspenseQuery(reportCountsQuery);

  if (data.open === 0) {
    return null;
  }

  return (
    <SidebarMenuBadge className="text-muted-foreground">
      {data.open}
    </SidebarMenuBadge>
  );
}
