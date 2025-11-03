import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidSort } from "@/lib/universal/cosmo/common";
import type { CollectionDataSource } from "@apollo/util";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validSorts } from "@/lib/universal/cosmo/common";
import { m } from "@/i18n/messages";

type Props = {
  sort: CosmoFilters["sort"];
  onChange: SetCosmoFilters;
  serials: boolean;
  dataSource?: CollectionDataSource;
  setDataSource?: (dataSource: CollectionDataSource) => void;
};

function getSortMap(): Record<ValidSort, string> {
  return {
    newest: m.filter_sort_newest(),
    oldest: m.filter_sort_oldest(),
    noAscending: m.filter_sort_no_ascending(),
    noDescending: m.filter_sort_no_descending(),
    serialAsc: m.filter_sort_serial_asc(),
    serialDesc: m.filter_sort_serial_desc(),
  };
}

export default function SortFilter(props: Props) {
  const availableSorts = validSorts.filter((s) =>
    props.serials ? true : !isSerialSort(s),
  );
  const map = getSortMap();

  function handleChange(newValue: string) {
    const newSort = newValue as ValidSort;

    // if the user is sorting by serial, we need to switch to blockchain
    if (isSerialSort(newSort) && props.dataSource && props.setDataSource) {
      props.setDataSource("blockchain");
    }

    props.onChange({
      sort: newSort === "newest" ? undefined : newSort,
    });
  }

  return (
    <Select value={props.sort ?? "newest"} onValueChange={handleChange}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder={m.filter_sort()} />
      </SelectTrigger>
      <SelectContent>
        {availableSorts.map((sort) => (
          <SelectItem key={sort} value={sort}>
            <span>{map[sort]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Determines if the sort is a serial sort.
 */
function isSerialSort(sort: ValidSort) {
  return sort.startsWith("serial");
}
