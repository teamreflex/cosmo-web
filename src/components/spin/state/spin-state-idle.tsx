import { Plus } from "lucide-react";
import { useObjektSpin, useSpinTickets } from "@/hooks/use-objekt-spin";
import { cn } from "@/lib/utils";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import SpinRates from "../spin-rates";

export default function StateIdle() {
  const { data } = useSpinTickets();
  const startSelecting = useObjektSpin((state) => state.startSelecting);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* get started */}
      <div className="flex flex-col gap-4 items-center justify-center">
        <button
          disabled={data.availableTicketsCount === 0}
          onClick={startSelecting}
          className={cn(
            "group flex items-center justify-center rounded-2xl md:rounded-lg aspect-photocard w-2/3 md:w-48 cursor-pointer",
            // coloring/animation
            "transition-colors bg-accent border-2 border-foreground/20 hover:border-cosmo",
            // disabled states
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-foreground/20"
          )}
        >
          <div className="flex items-center justify-center rounded-full bg-foreground/20 w-20 h-20 transition-transform group-hover:scale-105 group-disabled:scale-100">
            <Plus className="w-16 h-16" />
          </div>
        </button>

        {data.availableTicketsCount > 0 ? (
          <h3 className="text-lg font-bold">Select an objekt to spin</h3>
        ) : (
          <h3 className="text-lg font-bold">You have no spin tickets left</h3>
        )}
      </div>

      {/* statistics */}
      <div className="flex flex-col gap-4">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <button onClick={resetErrorBoundary}>retry</button>
              )}
            >
              <SpinRates />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </div>
  );
}
