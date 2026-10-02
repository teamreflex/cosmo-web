import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import { currentAccountQuery } from "@/lib/queries/core";
import {
  DEFAULT_MY_LISTING_SORT,
  type MyListingSort,
  type MyListingStatusKind,
  myListingSorts,
  myListingStatuses,
} from "@/lib/universal/market";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import FilterChip from "../collection/filter-chip";
import ClassFilter from "../collection/filter-class";
import SeasonFilter from "../collection/filter-season";
import ResetFilters from "../collection/reset-filters";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";

const route = getRouteApi("/market/my");

const statusLabels = {
  floor: m.listings_stat_floor(),
  undercut: m.my_listings_status_undercut(),
  onlySeller: m.my_listings_status_only_seller(),
  offMarket: m.my_listings_status_off_market(),
  unpriced: m.my_listings_status_unpriced(),
} satisfies Record<MyListingStatusKind, string>;

const sortLabels = {
  gap: m.my_listings_sort_gap(),
  newest: m.filter_sort_newest(),
  priceAsc: m.my_listings_sort_price_asc(),
  priceDesc: m.my_listings_sort_price_desc(),
} satisfies Record<MyListingSort, string>;

const sortSublabels = {
  gap: m.my_listings_sort_gap_sub(),
  newest: m.my_listings_sort_newest_sub(),
  priceAsc: m.my_listings_sort_price_asc_sub(),
  priceDesc: m.my_listings_sort_price_desc_sub(),
} satisfies Record<MyListingSort, string>;

/**
 * Market status, sale list, season, class and sort. On phones the chips
 * scroll in one row.
 */
export default function MyListingsFilters() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { filters, setFilters } = useCosmoFilters();
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const saleLists = (account?.objektLists ?? []).filter(
    (list) => list.type === "sale",
  );

  const count =
    (search.status ? 1 : 0) +
    (search.list ? 1 : 0) +
    (search.season?.length ?? 0) +
    (search.class?.length ?? 0) +
    (search.sort && search.sort !== DEFAULT_MY_LISTING_SORT ? 1 : 0);

  const statusOptions: SingleSelectOption<MyListingStatusKind | "all">[] = [
    { value: "all", label: m.my_listings_status_all() },
    ...myListingStatuses.map((status) => ({
      value: status,
      label: statusLabels[status],
    })),
  ];
  const listOptions: SingleSelectOption<string>[] = [
    { value: "all", label: m.my_listings_list_all() },
    ...saleLists.map((list) => ({ value: list.id, label: list.name })),
  ];
  const sortOptions: SingleSelectOption<MyListingSort>[] = myListingSorts.map(
    (sort) => ({
      value: sort,
      label: sortLabels[sort],
      sublabel: sortSublabels[sort],
    }),
  );
  const selectedList = saleLists.find((list) => list.id === search.list);
  const sort = search.sort ?? DEFAULT_MY_LISTING_SORT;

  return (
    <div className="flex flex-wrap items-center gap-2 max-sm:-mx-4 max-sm:no-scrollbar max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:mask-r-from-[calc(100%-1rem)] max-sm:px-4 max-sm:*:shrink-0">
      <FilterChip
        label={m.my_listings_filter_status()}
        valueLabel={
          search.status
            ? statusLabels[search.status].toLowerCase()
            : m.filter_value_all()
        }
        active={search.status != null}
        width={200}
      >
        {({ close }) => (
          <SingleSelectList
            options={statusOptions}
            value={search.status ?? "all"}
            onChange={(next) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  status: next === "all" ? undefined : next,
                }),
                replace: true,
              })
            }
            close={close}
          />
        )}
      </FilterChip>

      {saleLists.length > 1 && (
        <FilterChip
          label={m.my_listings_filter_list()}
          valueLabel={selectedList?.name ?? m.filter_value_all()}
          active={selectedList !== undefined}
          width={220}
        >
          {({ close }) => (
            <SingleSelectList
              options={listOptions}
              value={selectedList?.id ?? "all"}
              onChange={(next) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    list: next === "all" ? undefined : next,
                  }),
                  replace: true,
                })
              }
              close={close}
            />
          )}
        </FilterChip>
      )}

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
        valueLabel={sortLabels[sort].toLowerCase()}
        active={sort !== DEFAULT_MY_LISTING_SORT}
        width={240}
        className="max-sm:order-first"
      >
        {({ close }) => (
          <SingleSelectList
            options={sortOptions}
            value={sort}
            onChange={(next) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  sort: next === DEFAULT_MY_LISTING_SORT ? undefined : next,
                }),
                replace: true,
              })
            }
            close={close}
          />
        )}
      </FilterChip>

      <ResetFilters
        count={count}
        onReset={() => void navigate({ search: {}, replace: true })}
      />
    </div>
  );
}
