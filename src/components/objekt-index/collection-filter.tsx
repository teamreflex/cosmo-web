import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { useFilterData } from "@/hooks/use-filter-data";

export default function CollectionFilter({
  filters,
  setFilters,
}: PropsWithFilters) {
  const { collections } = useFilterData();
  const [open, setOpen] = useState(false);

  const value = filters?.collectionNo ?? [];

  function handleSelect(collection: string) {
    setFilters((prev) => {
      const newFilters = prev.collectionNo?.includes(collection)
        ? (prev.collectionNo ?? []).filter((f) => f !== collection)
        : [...(prev.collectionNo ?? []), collection];

      return {
        collectionNo: newFilters.length > 0 ? newFilters : null,
      };
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
            value.length > 0 && "border-cosmo"
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
                  onSelect={handleSelect}
                >
                  {collection}
                  <Check
                    className={cn(
                      "ml-auto",
                      value.includes(collection) ? "opacity-100" : "opacity-0"
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
