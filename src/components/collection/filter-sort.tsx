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
import { memo } from "react";

interface Props extends PropsWithFilters<"sort"> {
  serials: boolean;
}

const map: Record<ValidSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  noAscending: "Lowest No.",
  noDescending: "Highest No.",
  serialAsc: "Lowest Serial",
  serialDesc: "Highest Serial",
};

export default memo(function SortFilter({
  filters,
  setFilters,
  serials,
}: Props) {
  function update(value: string) {
    setFilters({
      sort: value === "newest" ? null : (value as ValidSort),
    });
  }

  const availableSorts = validSorts.filter((s) =>
    serials ? true : !s.startsWith("serial")
  );

  return (
    <Select value={filters ?? "newest"} onValueChange={update}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        {availableSorts.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {map[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
