import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { ValidSeason, validSeasons } from "@/lib/universal/cosmo/common";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = PropsWithFilters<"season">;

export default function SeasonFilter({ filters, setFilters }: Props) {
  const [open, setOpen] = useState(false);

  function onChange(property: ValidSeason, checked: boolean) {
    const newFilters = checked
      ? [...(filters ?? []), property]
      : (filters ?? []).filter((f) => f !== property);

    setFilters({
      season: newFilters.length > 0 ? newFilters : null,
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex gap-2 items-center",
            filters && filters.length > 0 && "dark:border-cosmo border-cosmo"
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
            onCheckedChange={(checked) => onChange(property, checked)}
          >
            {property}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
