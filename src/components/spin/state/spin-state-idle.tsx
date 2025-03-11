import { Plus } from "lucide-react";
import { useObjektSpin, useSpinTickets } from "@/hooks/use-objekt-spin";
import { cn } from "@/lib/utils";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import SpinRates from "../spin-rates";
import { useWallet } from "@/hooks/use-wallet";
import { useMemo } from "react";

export default function StateIdle() {
  const { data } = useSpinTickets();
  const startSelecting = useObjektSpin((state) => state.startSelecting);
  const { hasWallet } = useWallet();
  const text = useMemo(() => {
    if (hasWallet === false) {
      return "Re-sign in to spin";
    }

    if (data.availableTicketsCount === 0) {
      return "You have no spin tickets left";
    }

    return "Select an objekt to spin";
  }, [data.availableTicketsCount, hasWallet]);

  const isDisabled = data.availableTicketsCount === 0 || hasWallet === false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* get started */}
      <div className="flex flex-col gap-4 items-center justify-center">
        <button
          disabled={isDisabled}
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

        <h3 className="text-lg font-bold">{text}</h3>
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
