"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { memo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type Props = PropsWithFilters<"collectionNo"> & {
  collections: string[];
};

export default memo(function CollectionFilter({
  filters,
  setFilters,
  collections,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  function updateFilter(property: string, checked: boolean) {
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

    setFilters("collectionNo", newFilters.length > 0 ? newFilters : null);
  }

  function onInput(e: React.FormEvent<HTMLInputElement>) {
    e.preventDefault();
    setSearch(e.currentTarget.value);
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
          <span>Collections</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36 max-h-48 flex flex-col gap-2">
        <div className="flex justify-between w-full border-b border-accent">
          <input
            type="text"
            className="w-full p-2 bg-transparent outline-none text-sm"
            placeholder="Search..."
            value={search}
            onInput={onInput}
          />
          <button
            className="outline-none"
            onClick={() => setFilters("collectionNo", [])}
          >
            <X className="mr-1 h-4 w-4 opacity-50 hover:opacity-100 transition-colors" />
          </button>
        </div>

        <ScrollArea className="h-48 flex flex-col">
          {collections
            .filter((c) => c.toLowerCase().includes(search.toLowerCase()))
            .map((property) => (
              <DropdownMenuCheckboxItem
                key={property}
                checked={filters?.includes(property)}
                onCheckedChange={(checked) => updateFilter(property, checked)}
              >
                {property}
              </DropdownMenuCheckboxItem>
            ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
