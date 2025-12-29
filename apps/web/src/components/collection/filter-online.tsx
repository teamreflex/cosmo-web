import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { validOnlineTypes } from "@apollo/cosmo/types/common";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

function getOnlineTypeMap(): Record<ValidOnlineType, string> {
  return {
    online: m.filter_online_digital(),
    offline: m.filter_online_physical(),
  };
}

type Props = {
  onOffline: CosmoFilters["on_offline"];
  onChange: SetCosmoFilters;
};

export default function OnlineFilter({ onOffline: value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const map = getOnlineTypeMap();

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
            "flex items-center gap-2",
            (value?.length ?? 0) > 0 && "border-cosmo dark:border-cosmo",
          )}
        >
          <span>{m.filter_online_physical()}</span>
          <IconChevronDown className="h-4 w-4 opacity-50" />
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
