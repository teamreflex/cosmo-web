import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { CollectionDataSource } from "@/lib/utils";
import { Dispatch, SetStateAction, Suspense } from "react";
import LockedFilter from "../filter-locked";
// import GridableFilter from "../filter-gridable";
import TransferableFilter from "../filter-transferable";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";
import FilterDataSource from "../filter-data-source";
import { ErrorBoundary } from "react-error-boundary";
import Skeleton from "@/components/skeleton/skeleton";

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

      <TransferableFilter
        filters={filters.transferable}
        setFilters={setFilters}
      />

      <ErrorBoundary
        fallback={<Skeleton className="w-[100px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[100px] h-9" />}>
          <SeasonFilter filters={filters.season} setFilters={setFilters} />
        </Suspense>
      </ErrorBoundary>

      <OnlineFilter filters={filters.on_offline} setFilters={setFilters} />

      <ErrorBoundary
        fallback={<Skeleton className="w-[87px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[87px] h-9" />}>
          <ClassFilter filters={filters.class} setFilters={setFilters} />
        </Suspense>
      </ErrorBoundary>

      <SortFilter
        filters={filters.sort}
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
    </div>
  );
}
