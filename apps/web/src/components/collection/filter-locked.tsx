import { m } from "@/i18n/messages";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type LockedValue = "all" | "hide";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | undefined) => void;
};

export default function LockedFilter({ showLocked, setShowLocked }: Props) {
  const value: LockedValue = showLocked ? "all" : "hide";

  const options: SingleSelectOption<LockedValue>[] = [
    {
      value: "all",
      label: m.filter_locked_all(),
      sublabel: m.filter_locked_all_sub(),
    },
    {
      value: "hide",
      label: m.filter_locked_hide(),
      sublabel: m.filter_locked_hide_sub(),
    },
  ];

  function handleChange(newValue: LockedValue) {
    setShowLocked(newValue === "all" ? undefined : false);
  }

  const valueLabel =
    value === "all"
      ? m.filter_value_all()
      : (options.find((o) => o.value === value)?.label ?? value).toLowerCase();

  return (
    <FilterChip
      label={m.common_locked()}
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
