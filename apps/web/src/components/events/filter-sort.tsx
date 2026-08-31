import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import FilterChip from "../collection/filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";

type SortValue = "newest" | "oldest";

type Props = {
  sort: EventsFilters["sort"];
  onChange: SetEventsFilters;
};

export default function EventsSortFilter({ sort, onChange }: Props) {
  const value: SortValue = sort ?? "newest";

  const labels = {
    newest: m.filter_sort_newest(),
    oldest: m.filter_sort_oldest(),
  } satisfies Record<SortValue, string>;
  const options: SingleSelectOption<SortValue>[] = [
    { value: "newest", label: labels.newest },
    { value: "oldest", label: labels.oldest },
  ];

  function handleChange(newValue: SortValue) {
    onChange({
      sort: newValue === "newest" ? undefined : newValue,
    });
  }

  const valueLabel = labels[value].toLowerCase();

  return (
    <FilterChip
      label={m.filter_sort()}
      valueLabel={valueLabel}
      active={sort !== undefined && sort !== "newest"}
      width={180}
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
