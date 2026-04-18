import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import { validSorts } from "@apollo/cosmo/types/common";
import type { ValidSort } from "@apollo/cosmo/types/common";
import type { CollectionDataSource } from "@apollo/util";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type Props = {
  sort: CosmoFilters["sort"];
  onChange: SetCosmoFilters;
  serials: boolean;
  dataSource?: CollectionDataSource;
  setDataSource?: (dataSource: CollectionDataSource) => void;
};

const labelMap: Record<ValidSort, string> = {
  newest: m.filter_sort_newest(),
  oldest: m.filter_sort_oldest(),
  noAscending: m.filter_sort_no_ascending(),
  noDescending: m.filter_sort_no_descending(),
  serialAsc: m.filter_sort_serial_asc(),
  serialDesc: m.filter_sort_serial_desc(),
};

const sublabelMap: Record<ValidSort, string> = {
  newest: m.filter_sort_newest_sub(),
  oldest: m.filter_sort_oldest_sub(),
  noAscending: m.filter_sort_no_ascending_sub(),
  noDescending: m.filter_sort_no_descending_sub(),
  serialAsc: m.filter_sort_serial_asc_sub(),
  serialDesc: m.filter_sort_serial_desc_sub(),
};

export default function SortFilter(props: Props) {
  const value = props.sort ?? "newest";

  const options: SingleSelectOption<ValidSort>[] = validSorts
    .filter((s) => (props.serials ? true : !isSerialSort(s)))
    .map((sort) => ({
      value: sort,
      label: labelMap[sort],
      sublabel: sublabelMap[sort],
    }));

  function handleChange(newValue: ValidSort) {
    if (isSerialSort(newValue) && props.dataSource && props.setDataSource) {
      props.setDataSource("blockchain");
    }
    props.onChange({
      sort: newValue === "newest" ? undefined : newValue,
    });
  }

  return (
    <FilterChip
      label={m.filter_sort()}
      valueLabel={labelMap[value].toLowerCase()}
      active={value !== "newest"}
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

function isSerialSort(sort: ValidSort) {
  return sort.startsWith("serial");
}
