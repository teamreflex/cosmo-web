"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { ValidSort, validSorts } from "@/lib/universal/cosmo/common";
import { CollectionDataSource } from "@/lib/utils";

interface Props extends PropsWithFilters<"sort"> {
  serials: boolean;
  dataSource?: CollectionDataSource;
  setDataSource?: (dataSource: CollectionDataSource) => void;
}

const map: Record<ValidSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  noAscending: "Lowest No.",
  noDescending: "Highest No.",
  serialAsc: "Lowest Serial",
  serialDesc: "Highest Serial",
};

export default function SortFilter({
  filters,
  setFilters,
  dataSource,
  setDataSource,
  serials,
}: Props) {
  const availableSorts = validSorts.filter((s) =>
    serials ? true : !isSerialSort(s)
  );

  function onChange(value: string) {
    const newSort = value as ValidSort;

    // if the user is sorting by serial, we need to switch to blockchain
    if (isSerialSort(newSort) && dataSource && setDataSource) {
      setDataSource("blockchain");
    }

    setFilters({
      sort: newSort === "newest" ? null : newSort,
    });
  }

  return (
    <Select value={filters ?? "newest"} onValueChange={onChange}>
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
