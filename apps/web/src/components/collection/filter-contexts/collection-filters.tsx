import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { CollectionDataSource } from "@apollo/util";
import { Suspense } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ClassFilter from "../filter-class";
import FilterDataSource from "../filter-data-source";
import LockedFilter from "../filter-locked";
import OnlineFilter from "../filter-online";
import SeasonFilter from "../filter-season";
import SortFilter from "../filter-sort";
import TransferableFilter from "../filter-transferable";
import ResetFilters from "../reset-filters";

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
