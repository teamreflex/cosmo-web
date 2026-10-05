import CollectionFilter from "@/components/objekt-index/collection-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import { marketSorts, type MarketSort } from "@/lib/universal/market";
import type { watchlistFrontendSchema } from "@/lib/universal/parsers";
import { DEFAULT_WATCHLIST_SORT } from "@/lib/universal/watchlist";
import { getRouteApi } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { z } from "zod";
import FilterChip from "../collection/filter-chip";
import ClassFilter from "../collection/filter-class";
import OnlineFilter from "../collection/filter-online";
import SeasonFilter from "../collection/filter-season";
import ResetFilters from "../collection/reset-filters";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";
import { marketSortLabels, marketSortSublabels } from "./market-sort-labels";

const route = getRouteApi("/market/watchlist");

/**
 * The objekt index's collection filters and the market's sorts. The member
 * filter sits in the page header.
 */
export default function WatchlistFilters() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { filters, setFilters } = useCosmoFilters();

  const sortOptions: SingleSelectOption<MarketSort>[] = marketSorts.map(
    (sort) => ({
      value: sort,
      label: marketSortLabels[sort],
      sublabel: marketSortSublabels[sort],
    }),
  );
  const sort = search.sort ?? DEFAULT_WATCHLIST_SORT;

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

      <FilterChip
        label={m.filter_sort()}
        valueLabel={marketSortLabels[sort].toLowerCase()}
        active={sort !== DEFAULT_WATCHLIST_SORT}
        width={240}
      >
        {({ close }) => (
          <SingleSelectList
            options={sortOptions}
            value={sort}
            onChange={(next) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  sort: next === DEFAULT_WATCHLIST_SORT ? undefined : next,
                }),
                replace: true,
              })
            }
            close={close}
          />
        )}
      </FilterChip>

      <ResetFilters
        count={countActive(search)}
        onReset={() => void navigate({ search: {}, replace: true })}
      />
    </div>
  );
}

function countActive(search: z.infer<typeof watchlistFrontendSchema>) {
  return (
    (search.artist ? 1 : 0) +
    (search.member?.length ?? 0) +
    (search.season?.length ?? 0) +
    (search.class?.length ?? 0) +
    (search.on_offline?.length ?? 0) +
    (search.collectionNo?.length ?? 0) +
    (search.sort && search.sort !== DEFAULT_WATCHLIST_SORT ? 1 : 0)
  );
}
