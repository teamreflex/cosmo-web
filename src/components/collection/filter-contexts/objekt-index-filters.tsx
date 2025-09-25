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
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden">
      <ErrorBoundary
        fallback={<Skeleton className="w-[100px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[100px] h-9" />}>
          <SeasonFilter
            seasons={filters.season}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary
        fallback={<Skeleton className="w-[124px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[124px] h-9" />}>
          <CollectionFilter
            collections={filters.collectionNo}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <OnlineFilter onOffline={filters.on_offline} onChange={setFilters} />

      <ErrorBoundary
        fallback={<Skeleton className="w-[87px] h-9 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="w-[87px] h-9" />}>
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
