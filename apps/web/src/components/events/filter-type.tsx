import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { eventTypes, type EventTypeKey } from "@apollo/database/web/types";
import FilterChip from "../collection/filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";

type TypeValue = "all" | EventTypeKey;

type Props = {
  type: EventsFilters["type"];
  onChange: SetEventsFilters;
};

const eventTypeList = Object.values(eventTypes);

export default function EventsTypeFilter({ type, onChange }: Props) {
  const value: TypeValue = type ?? "all";

  const options: SingleSelectOption<TypeValue>[] = [
    { value: "all", label: m.filter_value_all() },
    ...eventTypeList.map((t) => ({
      value: t.value,
      label: t.label,
    })),
  ];

  function handleChange(newValue: TypeValue) {
    onChange({
      type: newValue === "all" ? undefined : newValue,
    });
  }

  const selectedType = type ? eventTypes[type] : undefined;
  const valueLabel =
    value === "all"
      ? m.filter_value_all()
      : (selectedType?.label.toLowerCase() ?? m.filter_value_all());

  return (
    <FilterChip
      label={m.common_type()}
      valueLabel={valueLabel}
      active={type !== undefined}
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
