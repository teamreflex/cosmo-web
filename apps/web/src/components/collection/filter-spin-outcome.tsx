import { m } from "@/i18n/messages";
import type { SpinOutcome } from "@/lib/universal/transfers";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type Value = SpinOutcome | "all";

type Props = {
  outcome: SpinOutcome | undefined;
  setOutcome: (outcome: SpinOutcome | undefined) => void;
};

export default function SpinOutcomeFilter({ outcome, setOutcome }: Props) {
  const options: SingleSelectOption<Value>[] = [
    { value: "all", label: m.filter_type_all() },
    { value: "success", label: m.transfer_outcome_success() },
    { value: "fail", label: m.transfer_outcome_fail() },
    { value: "pending", label: m.transfer_outcome_pending() },
  ];
  const value = outcome ?? "all";

  return (
    <FilterChip
      label={m.filter_outcome()}
      valueLabel={
        value === "all"
          ? m.filter_value_all()
          : (
              options.find((o) => o.value === value)?.label ?? value
            ).toLowerCase()
      }
      active={outcome !== undefined}
      width={180}
    >
      {({ close }) => (
        <SingleSelectList
          options={options}
          value={value}
          onChange={(next) => setOutcome(next === "all" ? undefined : next)}
          close={close}
        />
      )}
    </FilterChip>
  );
}
