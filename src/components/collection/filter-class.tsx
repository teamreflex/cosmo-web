import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, isEqual } from "@/lib/utils";
import type { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import Image from "next/image";
import { useFilterData } from "@/hooks/use-filter-data";
import type { ValidArtist } from "@/lib/universal/cosmo/common";

export default function ClassFilter({ filters, setFilters }: PropsWithFilters) {
  const { classes } = useFilterData();
  const [open, setOpen] = useState(false);

  const value = filters?.class ?? [];

  function onChange(artist: string, className: string, checked: boolean) {
    setFilters((prev) => {
      // allow switching artist without needing to uncheck
      if (prev.artist !== artist) {
        return {
          artist: artist as ValidArtist,
          class: [className],
        };
      }

      const newFilters = checked
        ? [...(prev?.class ?? []), className]
        : (prev?.class ?? []).filter((f) => f !== className);

      return {
        artist: newFilters.length > 0 ? (artist as ValidArtist) : null,
        class: newFilters.length > 0 ? newFilters : null,
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
            value.length > 0 && "dark:border-cosmo border-cosmo"
          )}
        >
          <span>Class</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-row gap-2">
        {classes.map(({ artist, classes }) => (
          <DropdownMenuGroup key={artist.id}>
            <DropdownMenuLabel className="text-xs flex items-center gap-2">
              <Image
                className="rounded-full aspect-square"
                src={artist.logoImageUrl}
                alt={artist.title}
                width={16}
                height={16}
              />
              {artist.title}
            </DropdownMenuLabel>
            {classes.map((className) => (
              <DropdownMenuCheckboxItem
                key={className}
                checked={
                  isEqual(artist.id, filters.artist ?? undefined) &&
                  value.includes(className)
                }
                onCheckedChange={(checked) =>
                  onChange(artist.id, className, checked)
                }
              >
                {className}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
