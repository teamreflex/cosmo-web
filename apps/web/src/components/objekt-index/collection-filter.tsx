import { Button } from "@/components/ui/button";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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

  function handleClose() {
    setOpen(false);
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
          <span>{m.filter_collections()}</span>
          <IconChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-0">
        <Command>
          <CommandInput
            placeholder={m.common_search_placeholder()}
            onClose={handleClose}
          />
          <CommandList>
            <CommandEmpty>{m.filter_collections_none()}</CommandEmpty>
            <CommandGroup>
              {collections.map((collection) => (
                <CommandItem
                  key={collection}
                  value={collection}
                  className="[content-visibility:auto]"
                  onSelect={handleSelect}
                >
                  {collection}
                  <IconCheck
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
