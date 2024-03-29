"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { ValidSorts, validSorts } from "@/lib/universal/cosmo/common";
import { memo } from "react";

interface Props extends PropsWithFilters<"sort"> {
  serials: boolean;
}

const map: Record<ValidSorts, string> = {
  [ValidSorts.NEWEST]: "Newest",
  [ValidSorts.OLDEST]: "Oldest",
  [ValidSorts.NO_ASCENDING]: "Lowest No.",
  [ValidSorts.NO_DESCENDING]: "Highest No.",
  [ValidSorts.SERIAL_ASCENDING]: "Lowest Serial",
  [ValidSorts.SERIAL_DESCENDING]: "Highest Serial",
};

export default memo(function SortFilter({
  filters,
  setFilters,
  serials,
}: Props) {
  function update(value: string) {
    setFilters(
      "sort",
      value === ValidSorts.NEWEST ? null : (value as ValidSorts)
    );
  }

  const availableSorts = validSorts.filter((s) =>
    serials ? true : !s.startsWith("serial")
  );

  return (
    <Select value={filters ?? "newest"} onValueChange={update}>
      <SelectTrigger className="w-32 drop-shadow-lg">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent
        ref={(ref) => {
          // fixes mobile touch-through bug in radix
          if (!ref) return;
          ref.ontouchstart = (e) => {
            e.preventDefault();
          };
        }}
      >
        {availableSorts.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {map[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
