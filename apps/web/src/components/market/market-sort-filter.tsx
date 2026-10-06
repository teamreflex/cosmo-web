import { m } from "@/i18n/messages";
import {
  DEFAULT_MARKET_SORT,
  marketSorts,
  type MarketSort,
} from "@/lib/universal/market";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import FilterChip from "../collection/filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";
import { marketSortLabels, marketSortSublabels } from "./market-sort-labels";

const route = getRouteApi("/market/");

/**
 * Sort chip for the market page. The market sorts live outside the shared
 * cosmo sort enum, so this reads and writes the route's own search param.
 */
export default function MarketSortFilter() {
  const sort = route.useSearch({ select: (search) => search.sort });
  const navigate = useNavigate();
  const value = sort ?? DEFAULT_MARKET_SORT;

  const options: SingleSelectOption<MarketSort>[] = marketSorts.map((s) => ({
    value: s,
    label: marketSortLabels[s],
    sublabel: marketSortSublabels[s],
  }));

  function handleChange(next: MarketSort) {
    void navigate({
      to: "/market",
      search: (prev) => ({
        ...prev,
        sort: next === DEFAULT_MARKET_SORT ? undefined : next,
      }),
      replace: true,
    });
  }

  return (
    <FilterChip
      label={m.filter_sort()}
      valueLabel={marketSortLabels[value].toLowerCase()}
      active={value !== DEFAULT_MARKET_SORT}
      width={240}
    >
      {({ close }) => (
        <SingleSelectList
          options={options}
          value={value}
          onChange={handleChange}
          close={close}
        />
      )}
    </FilterChip>
  );
}
