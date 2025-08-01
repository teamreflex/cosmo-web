import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { CollectionDataSource } from "@/lib/utils";
import { type Dispatch, type SetStateAction, Suspense } from "react";
import LockedFilter from "../filter-locked";
import TransferableFilter from "../filter-transferable";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";
import FilterDataSource from "../filter-data-source";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import ResetFilters from "../reset-filters";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | null) => void;
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
  const [filters, setFilters] = useCosmoFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden group-data-[show=true]:pb-2">
      <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />

      <TransferableFilter filters={filters} setFilters={setFilters} />

      <ErrorBoundary
        fallback={<Skeleton className="w-[100px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[100px] h-9" />}>
          <SeasonFilter filters={filters} setFilters={setFilters} />
        </Suspense>
      </ErrorBoundary>

      <OnlineFilter filters={filters} setFilters={setFilters} />

      <ErrorBoundary
        fallback={<Skeleton className="w-[87px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[87px] h-9" />}>
          <ClassFilter filters={filters} setFilters={setFilters} />
        </Suspense>
      </ErrorBoundary>

      <SortFilter
        filters={filters}
        setFilters={setFilters}
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
