import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidSort } from "@/lib/universal/cosmo/common";
import type { CollectionDataSource } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validSorts } from "@/lib/universal/cosmo/common";

type Props = {
  sort: CosmoFilters["sort"];
  onChange: SetCosmoFilters;
  serials: boolean;
  dataSource?: CollectionDataSource;
  setDataSource?: (dataSource: CollectionDataSource) => void;
};

const map: Record<ValidSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  noAscending: "Lowest No.",
  noDescending: "Highest No.",
  serialAsc: "Lowest Serial",
  serialDesc: "Highest Serial",
};

export default function SortFilter(props: Props) {
  const availableSorts = validSorts.filter((s) =>
    props.serials ? true : !isSerialSort(s)
  );

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
        <SelectValue placeholder="Sort" />
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
