import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type TransferableValue = "all" | "only";

type Props = {
  transferable: CosmoFilters["transferable"];
  onChange: SetCosmoFilters;
};

export default function TransferableFilter({ transferable, onChange }: Props) {
  const value: TransferableValue = transferable ? "only" : "all";

  const options: SingleSelectOption<TransferableValue>[] = [
    {
      value: "all",
      label: m.filter_transferable_all(),
      sublabel: m.filter_transferable_all_sub(),
    },
    {
      value: "only",
      label: m.filter_transferable_only(),
      sublabel: m.filter_transferable_only_sub(),
    },
  ];

  function handleChange(newValue: TransferableValue) {
    onChange({
      transferable: newValue === "only" ? true : undefined,
    });
  }

  const valueLabel =
    value === "all"
      ? m.filter_value_all()
      : (options.find((o) => o.value === value)?.label ?? value).toLowerCase();

  return (
    <FilterChip
      label={m.filter_transferable_label()}
      valueLabel={valueLabel}
      active={value !== "all"}
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
