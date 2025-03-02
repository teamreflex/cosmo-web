import { Suspense } from "react";
import SpinStatistics from "../spin-statistics";
import SpinRates from "../spin-rates";
import { ErrorBoundary } from "react-error-boundary";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useObjektSpin } from "@/hooks/use-objekt-spin";

export default function StateIdle() {
  const startSelecting = useObjektSpin((state) => state.startSelecting);

  return (
    <div className="flex flex-col">
      {/* statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <button onClick={resetErrorBoundary}>retry</button>
              )}
            >
              <Suspense fallback={<div>Loading spin statistics...</div>}>
                <SpinStatistics />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <button onClick={resetErrorBoundary}>retry</button>
              )}
            >
              <Suspense fallback={<div>Loading spin rates...</div>}>
                <SpinRates />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>

      {/* get started */}
      <button
        onClick={startSelecting}
        className="flex items-center justify-center rounded-2xl md:rounded-lg aspect-photocard border-2 border-foreground/20 bg-accent w-2/3 md:w-48 mx-auto cursor-pointer hover:border-cosmo transition-colors"
      >
        <div className="flex items-center justify-center rounded-full bg-foreground/20 w-24 h-24">
          <Plus className="w-20 h-20" />
        </div>
      </button>
    </div>
  );
}
