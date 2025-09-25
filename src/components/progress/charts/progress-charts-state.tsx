import { useErrorBoundary } from "react-error-boundary";
import { Button } from "../../ui/button";
import { RefreshCcw } from "lucide-react";
import { ProgressSectionSkeleton } from "./progress-section";

export function ProgressChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ProgressSectionSkeleton />
      <ProgressSectionSkeleton />
      <div className="col-span-full">
        <ProgressSectionSkeleton />
      </div>
    </div>
  );
}

export function ProgressChartsError() {
  const { resetBoundary } = useErrorBoundary();

  return (
    <div className="flex flex-col gap-2 items-center py-6 text-sm font-semibold">
      <p className="font-semibold text-sm text-center">
        Error fetching objekt stats
      </p>

      <Button variant="outline" onClick={resetBoundary}>
        <RefreshCcw className="mr-2" /> Try Again
      </Button>
    </div>
  );
}
