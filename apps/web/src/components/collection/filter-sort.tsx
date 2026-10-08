import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import { sortLabel } from "@/lib/client/objekt-util";
import { supportedSort } from "@/lib/universal/sorts";
import type { ValidSort } from "@apollo/cosmo/types/common";
import type { CollectionDataSource } from "@apollo/util";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type Props = {
  sort: CosmoFilters["sort"];
  onChange: SetCosmoFilters;
  // sorts this surface supports; any other selected sort reads as newest
  sorts: readonly ValidSort[];
  dataSource?: CollectionDataSource;
  setDataSource?: (dataSource: CollectionDataSource) => void;
};

const sublabelMap = {
  newest: m.filter_sort_newest_sub(),
  oldest: m.filter_sort_oldest_sub(),
  noAscending: m.filter_sort_no_ascending_sub(),
  noDescending: m.filter_sort_no_descending_sub(),
  serialAsc: m.filter_sort_serial_asc_sub(),
  serialDesc: m.filter_sort_serial_desc_sub(),
  memberAsc: m.filter_sort_member_asc_sub(),
  memberDesc: m.filter_sort_member_desc_sub(),
  duplicatesDesc: m.filter_sort_duplicates_desc_sub(),
  mintsAsc: m.filter_sort_mints_asc_sub(),
  mintsDesc: m.filter_sort_mints_desc_sub(),
} satisfies Record<ValidSort, string>;

export default function SortFilter(props: Props) {
  const value = supportedSort(props.sort, props.sorts);

  const options: SingleSelectOption<ValidSort>[] = props.sorts.map((sort) => ({
    value: sort,
    label: sortLabel(sort),
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
      valueLabel={sortLabel(value).toLowerCase()}
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
