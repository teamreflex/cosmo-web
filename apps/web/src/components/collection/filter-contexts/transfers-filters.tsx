import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { SpinOutcome, TransferType } from "@/lib/universal/transfers";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ClassFilter from "../filter-class";
import OnlineFilter from "../filter-online";
import SeasonFilter from "../filter-season";
import SpinOutcomeFilter from "../filter-spin-outcome";
import TransferTypeFilter from "../filter-transfer-type";

type Props = {
  type: TransferType;
  setType: (type: TransferType) => void;
  outcome: SpinOutcome | null;
  setOutcome: (outcome: SpinOutcome | null) => void;
};

/**
 * used on:
 * - @/nickname/trades
 */
export function TransfersFilters(props: Props) {
  const { filters, setFilters } = useCosmoFilters();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ErrorBoundary
        fallback={<Skeleton className="h-8 w-[119px] bg-destructive" />}
      >
        <Suspense
          fallback={
            <Skeleton className="h-8 w-[119px] border border-transparent dark:border-input" />
          }
        >
          <SeasonFilter
            seasons={filters.season}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <OnlineFilter onOffline={filters.on_offline} onChange={setFilters} />
      <ErrorBoundary
        fallback={<Skeleton className="h-8 w-[108px] bg-destructive" />}
      >
        <Suspense
          fallback={
            <Skeleton className="h-8 w-[108px] border border-transparent dark:border-input" />
          }
        >
          <ClassFilter
            classes={filters.class}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>
      <TransferTypeFilter type={props.type} setType={props.setType} />
      {props.type === "spin" && (
        <SpinOutcomeFilter
          outcome={props.outcome}
          setOutcome={props.setOutcome}
        />
      )}
    </div>
  );
}
