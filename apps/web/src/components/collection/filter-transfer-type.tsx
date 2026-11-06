import { m } from "@/i18n/messages";
import {
  type TransferType,
  typeHasCounterparty,
} from "@/lib/universal/transfers";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type Props = {
  type: TransferType;
  setType: (type: TransferType) => void;
  hasCounterparty: boolean;
};

export default function TransferTypeFilter({
  type,
  setType,
  hasCounterparty,
}: Props) {
  const option = (
    value: TransferType,
    label: string,
  ): SingleSelectOption<TransferType> => ({
    value,
    label,
    disabled: hasCounterparty && !typeHasCounterparty(value),
  });
  const options = [
    option("all", m.filter_type_all()),
    option("trade", m.filter_type_trade()),
    option("sent", m.filter_type_sent()),
    option("received", m.common_received()),
    option("mint", m.filter_type_mints()),
    option("spin", m.filter_type_spin()),
  ];

  const valueLabel =
    type === "all"
      ? m.filter_value_all()
      : (options.find((o) => o.value === type)?.label ?? type).toLowerCase();

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
