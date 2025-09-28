import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";
import FilterSearch from "../filter-search";
import ResetFilters from "../reset-filters";
import CollectionFilter from "@/components/objekt-index/collection-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";

type Props = {
  search?: boolean;
};

/**
 * used on:
 * - @/nickname/list/list-name
 * - /objekts
 */
export default function ObjektIndexFilters({ search = false }: Props) {
  const { filters, setFilters } = useCosmoFilters();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 group-data-[show=false]:hidden lg:group-data-[show=false]:flex">
      <ErrorBoundary
        fallback={<Skeleton className="h-9 w-[100px] bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-9 w-[100px]" />}>
          <SeasonFilter
            seasons={filters.season}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary
        fallback={<Skeleton className="h-9 w-[124px] bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-9 w-[124px]" />}>
          <CollectionFilter
            collections={filters.collectionNo}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <OnlineFilter onOffline={filters.on_offline} onChange={setFilters} />

      <ErrorBoundary
        fallback={<Skeleton className="h-9 w-[87px] bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-9 w-[87px]" />}>
          <ClassFilter
            classes={filters.class}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <SortFilter sort={filters.sort} onChange={setFilters} serials={false} />

      {search && <FilterSearch />}

      <ResetFilters filters={filters} setFilters={setFilters} />
    </div>
  );
}
