import { Skeleton } from "@/components/ui/skeleton";
import { type CosmoFilters, useCosmoFilters } from "@/hooks/use-cosmo-filters";
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
  isSpin?: boolean;
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
  isSpin,
}: Props) {
  const { filters, setFilters } = useCosmoFilters();
  const count = countActive(filters);

  function handleReset() {
    setFilters({
      member: undefined,
      artist: undefined,
      sort: undefined,
      class: undefined,
      season: undefined,
      on_offline: undefined,
      transferable: undefined,
      gridable: undefined,
      collectionNo: undefined,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
        serials={!isSpin}
      />

      <FilterDataSource
        filters={filters}
        setFilters={setFilters}
        dataSource={dataSource}
        setDataSource={setDataSource}
      />

      <ResetFilters count={count} onReset={handleReset} />
    </div>
  );
}

function countActive(filters: CosmoFilters) {
  let n = 0;
  for (const [key, value] of Object.entries(filters)) {
    if (key === "sort") {
      if (value !== undefined && value !== "newest") n += 1;
      continue;
    }
    if (value === undefined || value === null || value === false) continue;
    if (Array.isArray(value)) n += value.length;
    else n += 1;
  }
  return n;
}
