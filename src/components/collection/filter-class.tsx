"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropsWithFilters } from "./collection-renderer";
import { ValidClasses } from "@/lib/universal/cosmo/common";
import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = PropsWithFilters<"class">;

export default memo(function ClassFilter({ filters, setFilters }: Props) {
  const [open, setOpen] = useState(false);

  function updateFilter(property: ValidClasses, checked: boolean) {
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

    setFilters("class", newFilters);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex gap-2 items-center drop-shadow-lg",
            filters && filters.length > 0 && "border-cosmo"
          )}
        >
          <span>Class</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        {Object.values(ValidClasses).map((classType) => (
          <DropdownMenuCheckboxItem
            key={classType}
            checked={filters?.includes(classType)}
            onCheckedChange={(checked) => updateFilter(classType, checked)}
          >
            {classType}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
