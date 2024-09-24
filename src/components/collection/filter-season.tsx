"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { ValidSeason, validSeasons } from "@/lib/universal/cosmo/common";
import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = PropsWithFilters<"season">;

export default memo(function SeasonFilter({ filters, setFilters }: Props) {
  const [open, setOpen] = useState(false);

  function updateFilter(property: ValidSeason, checked: boolean) {
    let newFilters = filters ?? [];

    if (checked) {
      if (!newFilters.includes(property)) {
        newFilters.push(property);
      }
    } else {
      if (newFilters.includes(property)) {
        newFilters = newFilters.filter((f) => f !== property);
      }
    }

    setFilters("season", newFilters.length > 0 ? newFilters : null);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex gap-2 items-center",
            filters && filters.length > 0 && "border-cosmo"
          )}
        >
          <span>Season</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        {Object.values(validSeasons).map((property) => (
          <DropdownMenuCheckboxItem
            key={property}
            checked={filters?.includes(property)}
            onCheckedChange={(checked) => updateFilter(property, checked)}
          >
            {property}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
