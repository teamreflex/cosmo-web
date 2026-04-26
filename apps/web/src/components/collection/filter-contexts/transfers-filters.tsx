import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { TransferType } from "@/lib/universal/transfers";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ClassFilter from "../filter-class";
import OnlineFilter from "../filter-online";
import SeasonFilter from "../filter-season";
import TransferTypeFilter from "../filter-transfer-type";

type Props = {
  type: TransferType;
  setType: (type: TransferType) => void;
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
    </div>
  );
}
