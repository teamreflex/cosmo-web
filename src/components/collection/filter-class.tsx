import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ValidClass, validClasses } from "@/lib/universal/cosmo/common";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";

type Props = PropsWithFilters<"class">;

export default function ClassFilter({ filters, setFilters }: Props) {
  const [open, setOpen] = useState(false);

  function onChange(property: ValidClass, checked: boolean) {
    const newFilters = checked
      ? [...(filters ?? []), property]
      : (filters ?? []).filter((f) => f !== property);

    setFilters({
      class: newFilters.length > 0 ? newFilters : null,
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
          <span>Class</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36">
        {Object.values(validClasses).map((classType) => (
          <DropdownMenuCheckboxItem
            key={classType}
            checked={filters?.includes(classType)}
            onCheckedChange={(checked) => onChange(classType, checked)}
          >
            {classType}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
