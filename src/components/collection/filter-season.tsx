import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, isEqual } from "@/lib/utils";
import { useFilterData } from "@/hooks/use-filter-data";

export default function SeasonFilter({
  filters,
  setFilters,
}: PropsWithFilters) {
  const { seasons } = useFilterData();
  const [open, setOpen] = useState(false);

  const value = filters?.season ?? [];

  function onChange(artist: string, season: string, checked: boolean) {
    setFilters((prev) => {
      // allow switching artist without needing to uncheck
      if (prev.artist !== artist) {
        return {
          artist: artist as ValidArtist,
          season: [season],
        };
      }

      const newFilters = checked
        ? [...(prev?.season ?? []), season]
        : (prev?.season ?? []).filter((f) => f !== season);

      return {
        artist: newFilters.length > 0 ? (artist as ValidArtist) : null,
        season: newFilters.length > 0 ? newFilters : null,
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
          <span>Season</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-row gap-2">
        {seasons.map(({ artist, seasons }) => (
          <DropdownMenuGroup key={artist.id}>
            <DropdownMenuLabel className="text-xs flex items-center gap-2">
              <img
                className="rounded-full aspect-square size-4"
                src={artist.logoImageUrl}
                alt={artist.title}
              />
              {artist.title}
            </DropdownMenuLabel>
            {seasons.map((season) => (
              <DropdownMenuCheckboxItem
                key={season}
                checked={
                  isEqual(artist.id, filters.artist ?? undefined) &&
                  value.includes(season)
                }
                onCheckedChange={(checked) =>
                  onChange(artist.id, season, checked)
                }
              >
                {season}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
