import { Plus } from "lucide-react";
import { useObjektSpin } from "@/hooks/use-objekt-spin";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useUserState } from "@/hooks/use-user-state";
import { ticketsQuery } from "../queries";
import { Suspense } from "react";
import Skeleton from "@/components/skeleton/skeleton";
import { CosmoSpinGetTickets } from "@/lib/universal/cosmo/spin";
import { cn } from "@/lib/utils";

export default function StateIdle() {
  const { token, artist } = useUserState();
  const startSelecting = useObjektSpin((state) => state.startSelecting);
  const queryClient = useQueryClient();

  // should already be prefetched at this point
  const ticketsAvailable = queryClient.getQueryData<CosmoSpinGetTickets>(
    ticketsQuery(token!.accessToken, artist).queryKey
  );

  return (
    <div className="flex flex-col">
      {/* statistics */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div> */}

      {/* get started */}
      <div className="flex flex-col gap-4 items-center justify-center mx-auto w-full">
        <button
          disabled={ticketsAvailable?.availableTicketsCount === 0}
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

        <Suspense fallback={<Skeleton className="h-7 w-56 rounded-full" />}>
          <Title />
        </Suspense>
      </div>
    </div>
  );
}

function Title() {
  const { token, artist } = useUserState();
  const { data } = useSuspenseQuery(ticketsQuery(token!.accessToken, artist));

  if (data.availableTicketsCount > 0) {
    return <h3 className="text-lg font-bold">Select an objekt to spin</h3>;
  }

  return <h3 className="text-lg font-bold">You have no spin tickets left</h3>;
}
