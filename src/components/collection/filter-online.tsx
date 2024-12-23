"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import {
  ValidOnlineType,
  validOnlineTypes,
} from "@/lib/universal/cosmo/common";
import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = PropsWithFilters<"on_offline">;

const map: Record<ValidOnlineType, string> = {
  online: "Digital",
  offline: "Physical",
};

export default memo(function OnlineFilter({ filters, setFilters }: Props) {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";
  const [open, setOpen] = useState(false);

  function updateFilter(property: ValidOnlineType, checked: boolean) {
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

    setFilters({
      on_offline: newFilters.length > 0 ? newFilters : null,
    });
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
          <span>Physical</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        {Object.values(validOnlineTypes).map((onlineType) => (
          <DropdownMenuCheckboxItem
            key={onlineType}
            checked={filters?.includes(onlineType)}
            onCheckedChange={(checked) => updateFilter(onlineType, checked)}
          >
            {map[onlineType]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
