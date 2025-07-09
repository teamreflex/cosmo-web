"use client";

import { useErrorBoundary } from "react-error-boundary";
import { Button } from "../../ui/button";
import { RefreshCcw } from "lucide-react";

export function ProgressChartsSkeleton() {
  return <div>ProgressChartsSkeleton</div>;
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
