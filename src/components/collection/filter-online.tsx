import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidOnlineType } from "@/lib/universal/cosmo/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { validOnlineTypes } from "@/lib/universal/cosmo/common";
import { cn } from "@/lib/utils";

const map: Record<ValidOnlineType, string> = {
  online: "Digital",
  offline: "Physical",
};

type Props = {
  onOffline: CosmoFilters["on_offline"];
  onChange: SetCosmoFilters;
};

export default function OnlineFilter({ onOffline: value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function handleChange(property: ValidOnlineType, checked: boolean) {
    onChange(() => {
      const newFilters = checked
        ? [...(value ?? []), property]
        : (value ?? []).filter((f) => f !== property);

      return {
        on_offline: newFilters.length > 0 ? newFilters : undefined,
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
            (value?.length ?? 0) > 0 && "dark:border-cosmo border-cosmo",
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
            checked={value?.includes(onlineType) ?? false}
            onCheckedChange={(checked) => handleChange(onlineType, checked)}
          >
            {map[onlineType]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
