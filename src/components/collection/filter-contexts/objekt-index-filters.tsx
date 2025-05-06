import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";
import CollectionFilter from "@/components/objekt-index/collection-filter";
import { Suspense } from "react";
import Skeleton from "@/components/skeleton/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import FilterSearch from "../filter-search";

/**
 * used on:
 * - @/nickname/list/list-name
 * - /objekts
 */
export default function ObjektIndexFilters() {
  const [filters, setFilters] = useCosmoFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden">
      <ErrorBoundary
        fallback={<Skeleton className="w-[100px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[100px] h-9" />}>
          <SeasonFilter filters={filters.season} setFilters={setFilters} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary
        fallback={<Skeleton className="w-[124px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[124px] h-9" />}>
          <CollectionFilter
            filters={filters.collectionNo}
            setFilters={setFilters}
          />
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
        serials={false}
      />

      <FilterSearch />
    </div>
  );
}
