"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

interface Props extends PropsWithFilters<"collectionNo"> {
  collections: string[];
}

export default function CollectionFilter({
  filters,
  setFilters,
  collections,
}: Props) {
  const [open, setOpen] = useState(false);

  function onChange(collection: string) {
    const newFilters = filters?.includes(collection)
      ? (filters ?? []).filter((f) => f !== collection)
      : [...(filters ?? []), collection];

    setFilters({
      collectionNo: newFilters.length > 0 ? newFilters : null,
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex gap-2 items-center",
            filters && filters.length > 0 && "border-cosmo"
          )}
        >
          <span>Collections</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No collection found.</CommandEmpty>
            <CommandGroup>
              {collections.map((collection) => (
                <CommandItem
                  key={collection}
                  value={collection}
                  className="[content-visibility:auto]"
                  onSelect={(v) => onChange(collection)}
                >
                  {collection}
                  <Check
                    className={cn(
                      "ml-auto",
                      filters?.includes(collection)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
