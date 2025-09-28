import { useErrorBoundary } from "react-error-boundary";
import { RefreshCcw } from "lucide-react";
import { Button } from "../../ui/button";
import { ProgressSectionSkeleton } from "./progress-section";

export function ProgressChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
    <div className="flex flex-col items-center gap-2 py-6 text-sm font-semibold">
      <p className="text-center text-sm font-semibold">
        Error fetching objekt stats
      </p>

      <Button variant="outline" onClick={resetBoundary}>
        <RefreshCcw className="mr-2" /> Try Again
      </Button>
    </div>
  );
}
