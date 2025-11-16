import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import LockedFilter from "../filter-locked";
import TransferableFilter from "../filter-transferable";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";
import FilterDataSource from "../filter-data-source";
import ResetFilters from "../reset-filters";
import type { Dispatch, SetStateAction } from "react";
import type { CollectionDataSource } from "@apollo/util";
import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | undefined) => void;
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};

/**
 * used on:
 * - @/nickname
 */
export default function CollectionFilters({
  showLocked,
  setShowLocked,
  dataSource,
  setDataSource,
}: Props) {
  const { filters, setFilters } = useCosmoFilters();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 group-data-[show=false]:hidden group-data-[show=true]:pb-2 lg:group-data-[show=false]:flex">
      <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />

      <TransferableFilter
        transferable={filters.transferable}
        onChange={setFilters}
      />

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

      <SortFilter
        sort={filters.sort}
        onChange={setFilters}
        dataSource={dataSource}
        setDataSource={setDataSource}
        serials
      />

      <FilterDataSource
        filters={filters}
        setFilters={setFilters}
        dataSource={dataSource}
        setDataSource={setDataSource}
      />

      <ResetFilters filters={filters} setFilters={setFilters} />
    </div>
  );
}
