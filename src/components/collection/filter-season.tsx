"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropsWithFilters } from "./collection-renderer";
import { ValidSeason, validSeasons } from "@/lib/server/cosmo";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = PropsWithFilters<"season">;

export function SeasonFilter({ filters, setFilters }: Props) {
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

    setFilters(newFilters);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex gap-2 items-center",
            filters && filters.length > 0 && "border-violet-600"
          )}
        >
          <span>Season</span>
          <ChevronDown
            className={cn("h-4 w-4 transition", !open && "rotate-180")}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        {validSeasons.map((property) => (
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
}
