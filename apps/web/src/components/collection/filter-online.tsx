import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type OnlineValue = "any" | ValidOnlineType;

type Props = {
  onOffline: CosmoFilters["on_offline"];
  onChange: SetCosmoFilters;
  label?: string;
  /**
   * What the chip reads with nothing picked, in place of "all".
   */
  unsetLabel?: string;
};

export default function OnlineFilter({
  onOffline,
  onChange,
  label = m.filter_type(),
  unsetLabel = m.filter_value_all(),
}: Props) {
  const value: OnlineValue = deriveValue(onOffline);

  const options: SingleSelectOption<OnlineValue>[] = [
    {
      value: "any",
      label: m.filter_online_any(),
      sublabel: m.filter_online_any_sub(),
    },
    {
      value: "offline",
      label: m.filter_online_physical(),
      sublabel: m.filter_online_physical_sub(),
    },
    {
      value: "online",
      label: m.filter_online_digital(),
      sublabel: m.filter_online_digital_sub(),
    },
  ];

  function handleChange(newValue: OnlineValue) {
    onChange({
      on_offline: newValue === "any" ? undefined : [newValue],
    });
  }

  const valueLabel =
    value === "any"
      ? unsetLabel
      : (options.find((o) => o.value === value)?.label ?? value);

  return (
    <FilterChip
      label={label}
      valueLabel={valueLabel}
      active={value !== "any"}
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

function deriveValue(value: CosmoFilters["on_offline"]): OnlineValue {
  if (!value || value.length === 0 || value.length === 2) return "any";
  return value[0] ?? "any";
}
