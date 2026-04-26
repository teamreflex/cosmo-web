import FilterChip from "@/components/collection/filter-chip";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

type Props = {
  collections: CosmoFilters["collectionNo"];
  onChange: SetCosmoFilters;
};

export default function CollectionFilter(props: Props) {
  const { collections } = useFilterData();
  const value = props.collections ?? [];

  function handleSelect(collection: string) {
    props.onChange(() => {
      const newFilters = value.includes(collection)
        ? value.filter((f) => f !== collection)
        : [...value, collection];

      return {
        collectionNo: newFilters.length > 0 ? newFilters : null,
      };
    });
  }

  const valueLabel =
    value.length === 0
      ? m.filter_value_all()
      : value.length === 1
        ? value[0]!
        : m.filter_value_multiple();

  return (
    <FilterChip
      label={m.filter_collections()}
      valueLabel={valueLabel}
      count={value.length}
      active={value.length > 0}
      width={260}
    >
      <Command>
        <CommandInput placeholder={m.common_search_placeholder()} />
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
                    value.includes(collection) ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </FilterChip>
  );
}
