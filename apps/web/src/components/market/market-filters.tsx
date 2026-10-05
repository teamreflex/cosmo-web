import CollectionFilter from "@/components/objekt-index/collection-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { type CosmoFilters, useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { DEFAULT_MARKET_SORT } from "@/lib/universal/market";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ClassFilter from "../collection/filter-class";
import OnlineFilter from "../collection/filter-online";
import SeasonFilter from "../collection/filter-season";
import ResetFilters from "../collection/reset-filters";
import MarketListedFilter from "./market-listed-filter";
import MarketPriceFilter from "./market-price-filter";
import MarketSortFilter from "./market-sort-filter";

const route = getRouteApi("/market/");

/**
 * The objekt index filter set with the market sort in place of the cosmo sort,
 * plus the floor price and listing window.
 */

export default function MarketFilters() {
  const { filters, setFilters } = useCosmoFilters();
  const search = route.useSearch();
  const navigate = useNavigate();
  const count =
    countActive(filters) +
    (search.sort && search.sort !== DEFAULT_MARKET_SORT ? 1 : 0) +
    (search.listed ? 1 : 0) +
    (search.price_min != null || search.price_max != null ? 1 : 0);

  function handleReset() {
    void navigate({
      to: "/market",
      search: {},
      replace: true,
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

      <MarketPriceFilter />

      <MarketListedFilter />

      <MarketSortFilter />

      <ResetFilters count={count} onReset={handleReset} />
    </div>
  );
}

// the cosmo sort never applies here; the market sort is counted by the caller
function countActive(filters: CosmoFilters) {
  let n = 0;
  for (const [key, value] of Object.entries(filters)) {
    if (key === "sort") continue;
    if (value === undefined || value === null || value === false) continue;
    if (Array.isArray(value)) n += value.length;
    else n += 1;
  }
  return n;
}
