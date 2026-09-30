import { m } from "@/i18n/messages";
import {
  type MarketListedWindow,
  marketListedWindows,
} from "@/lib/universal/market";
import { getRouteApi } from "@tanstack/react-router";
import FilterChip from "../collection/filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";

const route = getRouteApi("/market");

type ListedValue = "any" | MarketListedWindow;

const labelMap = {
  any: m.filter_listed_any(),
  "24h": m.filter_listed_24h(),
  "7d": m.filter_listed_7d(),
  "30d": m.filter_listed_30d(),
} satisfies Record<ListedValue, string>;

const options: SingleSelectOption<ListedValue>[] = (
  ["any", ...marketListedWindows] satisfies ListedValue[]
).map((value) => ({ value, label: labelMap[value] }));

/**
 * Keeps collections whose most recent listing falls inside the window.
 */
export default function MarketListedFilter() {
  const listed = route.useSearch({ select: (search) => search.listed });
  const navigate = route.useNavigate();
  const value = listed ?? "any";

  function handleChange(next: ListedValue) {
    void navigate({
      search: (prev) => ({
        ...prev,
        listed: next === "any" ? undefined : next,
      }),
      replace: true,
    });
  }

  return (
    <FilterChip
      label={m.filter_listed()}
      valueLabel={
        value === "any" ? m.filter_value_any() : labelMap[value].toLowerCase()
      }
      active={value !== "any"}
      width={200}
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
