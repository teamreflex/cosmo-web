import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFilterData } from "@/hooks/use-filter-data";

type Props = {
  collections: CosmoFilters["collectionNo"];
  onChange: SetCosmoFilters;
};

export default function CollectionFilter(props: Props) {
  const { collections } = useFilterData();
  const [open, setOpen] = useState(false);

  function handleSelect(collection: string) {
    props.onChange(() => {
      const newFilters = props.collections?.includes(collection)
        ? props.collections.filter((f) => f !== collection)
        : [...(props.collections ?? []), collection];

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
            "flex items-center gap-2",
            (props.collections?.length ?? 0) > 0 && "border-cosmo",
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
                      props.collections?.includes(collection)
                        ? "opacity-100"
                        : "opacity-0",
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
