import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import TransferTypeFilter from "../filter-transfer-type";
import type { TransferType } from "@/lib/universal/transfers";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="flex flex-wrap items-center justify-center gap-2 group-data-[show=false]:hidden lg:group-data-[show=false]:flex">
      <ErrorBoundary
        fallback={<Skeleton className="h-9 w-[97px] bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-9 w-[97px]" />}>
          <SeasonFilter
            seasons={filters.season}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <OnlineFilter onOffline={filters.on_offline} onChange={setFilters} />
      <ErrorBoundary
        fallback={<Skeleton className="h-9 w-[85px] bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-9 w-[85px]" />}>
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
