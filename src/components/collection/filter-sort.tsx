"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropsWithFilters } from "./collection-renderer";
import { ValidSort, validSorts } from "@/lib/server/cosmo";

type Props = PropsWithFilters<"sort">;

const map: Record<ValidSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  noAscending: "Lowest No.",
  noDescending: "Highest No.",
};

export function SortFilter({ filters, setFilters }: Props) {
  return (
    <Select value={filters} onValueChange={setFilters}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        {validSorts.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {map[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
