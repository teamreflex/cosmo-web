import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { IconRefresh } from "@tabler/icons-react";
import { useErrorBoundary } from "react-error-boundary";
import { Button } from "../../ui/button";

export function ProgressChartsSkeleton() {
  return (
    <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SkeletonGradient />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="col-span-full h-64 w-full rounded-xl" />
    </div>
  );
}

export function ProgressChartsError() {
  const { resetBoundary } = useErrorBoundary();

  return (
    <div className="flex flex-col items-center gap-2 py-6 text-sm font-semibold">
      <p className="text-center text-sm font-semibold">
        {m.progress_error_fetching_stats()}
      </p>

      <Button variant="outline" onClick={resetBoundary}>
        <IconRefresh className="mr-2" /> {m.error_try_again()}
      </Button>
    </div>
  );
}
