import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import {
  type ValidOnlineType,
  validOnlineTypes,
} from "@/lib/universal/cosmo/common";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const map: Record<ValidOnlineType, string> = {
  online: "Digital",
  offline: "Physical",
};

export default function OnlineFilter({
  filters,
  setFilters,
}: PropsWithFilters) {
  const [open, setOpen] = useState(false);

  const value = filters?.on_offline ?? [];

  function onChange(property: ValidOnlineType, checked: boolean) {
    setFilters((prev) => {
      const newFilters = checked
        ? [...(prev?.on_offline ?? []), property]
        : (prev?.on_offline ?? []).filter((f) => f !== property);

      return {
        on_offline: newFilters.length > 0 ? newFilters : null,
      };
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex gap-2 items-center",
            value.length > 0 && "dark:border-cosmo border-cosmo"
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
            checked={value.includes(onlineType)}
            onCheckedChange={(checked) => onChange(onlineType, checked)}
          >
            {map[onlineType]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
