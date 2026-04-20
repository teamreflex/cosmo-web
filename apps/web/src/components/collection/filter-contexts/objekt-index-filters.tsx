import CollectionFilter from "@/components/objekt-index/collection-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { type CosmoFilters, useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ClassFilter from "../filter-class";
import OnlineFilter from "../filter-online";
import FilterSearch from "../filter-search";
import SeasonFilter from "../filter-season";
import SortFilter from "../filter-sort";
import ResetFilters from "../reset-filters";

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
      <ErrorBoundary
        fallback={<Skeleton className="h-8 w-[119px] bg-destructive" />}
      >
        <Suspense
          fallback={
            <Skeleton className="h-8 w-[119px] border border-transparent dark:border-input" />
          }
        >
          <SeasonFilter
            seasons={filters.season}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary
        fallback={<Skeleton className="h-8 w-[141px] bg-destructive" />}
      >
        <Suspense
          fallback={
            <Skeleton className="h-8 w-[141px] border border-transparent dark:border-input" />
          }
        >
          <CollectionFilter
            collections={filters.collectionNo}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <OnlineFilter onOffline={filters.on_offline} onChange={setFilters} />

      <ErrorBoundary
        fallback={<Skeleton className="h-8 w-[108px] bg-destructive" />}
      >
        <Suspense
          fallback={
            <Skeleton className="h-8 w-[108px] border border-transparent dark:border-input" />
          }
        >
          <ClassFilter
            classes={filters.class}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>

      <SortFilter sort={filters.sort} onChange={setFilters} serials={false} />

      {search && <FilterSearch />}

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
