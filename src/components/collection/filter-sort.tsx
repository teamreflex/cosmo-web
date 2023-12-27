"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropsWithFilters } from "./collection-renderer";
import { ValidSorts, validSorts } from "@/lib/universal/cosmo/common";

type Props = PropsWithFilters<"sort">;

const map: Record<ValidSorts, string> = {
  [ValidSorts.NEWEST]: "Newest",
  [ValidSorts.OLDEST]: "Oldest",
  [ValidSorts.NO_ASCENDING]: "Lowest No.",
  [ValidSorts.NO_DESCENDING]: "Highest No.",
};

export function SortFilter({ filters, setFilters }: Props) {
  return (
    <Select
      value={filters ?? "newest"}
      onValueChange={(v) => setFilters(v as ValidSorts)}
    >
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
        {validSorts.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {map[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
