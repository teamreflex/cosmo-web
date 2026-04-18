import { m } from "@/i18n/messages";
import type { TransferType } from "@/lib/universal/transfers";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type Props = {
  type: TransferType;
  setType: (type: TransferType) => void;
};

export default function TransferTypeFilter({ type, setType }: Props) {
  const options: SingleSelectOption<TransferType>[] = [
    { value: "all", label: m.filter_type_all() },
    { value: "mint", label: m.filter_type_mints() },
    { value: "received", label: m.common_received() },
    { value: "sent", label: m.filter_type_sent() },
    { value: "spin", label: m.filter_type_spin() },
  ];

  const valueLabel =
    type === "all"
      ? m.filter_value_all()
      : options.find((o) => o.value === type)!.label.toLowerCase();

  return (
    <FilterChip
      label={m.filter_action()}
      valueLabel={valueLabel}
      active={type !== "all"}
      width={200}
    >
      {({ close }) => (
        <SingleSelectList
          options={options}
          value={type}
          onChange={setType}
          close={close}
        />
      )}
    </FilterChip>
  );
}
