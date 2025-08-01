import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";
import CollectionFilter from "@/components/objekt-index/collection-filter";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import FilterSearch from "../filter-search";
import ResetFilters from "../reset-filters";

/**
 * used on:
 * - @/nickname/list/list-name
 * - /objekts
 */
export default function ObjektIndexFilters({
  search = false,
}: {
  search?: boolean;
}) {
  const [filters, setFilters] = useCosmoFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden">
      <ErrorBoundary
        fallback={<Skeleton className="w-[100px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[100px] h-9" />}>
          <SeasonFilter filters={filters} setFilters={setFilters} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary
        fallback={<Skeleton className="w-[124px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[124px] h-9" />}>
          <CollectionFilter filters={filters} setFilters={setFilters} />
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

      <SortFilter filters={filters} setFilters={setFilters} serials={false} />

      {search && <FilterSearch />}

      <ResetFilters filters={filters} setFilters={setFilters} />
    </div>
  );
}
