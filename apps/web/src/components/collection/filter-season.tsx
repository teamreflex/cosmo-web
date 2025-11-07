import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { isEqual } from "@apollo/util";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";

type Props = {
  seasons: CosmoFilters["season"];
  artist: CosmoFilters["artist"];
  onChange: SetCosmoFilters;
};

export default function SeasonFilter(props: Props) {
  const { seasons } = useFilterData();
  const [open, setOpen] = useState(false);

  const value = props.seasons ?? [];

  function handleChange(artist: string, season: string, checked: boolean) {
    props.onChange((prev) => {
      // allow switching artist without needing to uncheck
      if (prev.artist !== artist) {
        return {
          artist: artist as ValidArtist,
          season: [season],
        };
      }

      const newFilters = checked
        ? [...(prev.season ?? []), season]
        : (prev.season ?? []).filter((f) => f !== season);

      return {
        artist: newFilters.length > 0 ? artist : undefined,
        season: newFilters.length > 0 ? newFilters : undefined,
      };
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2",
            value.length > 0 && "border-cosmo dark:border-cosmo",
          )}
        >
          <span>{m.common_season()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-row gap-2">
        {seasons.map(({ artist, seasons: artistSeasons }) => (
          <DropdownMenuGroup key={artist.id}>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <img
                className="aspect-square size-4 rounded-full"
                src={artist.logoImageUrl}
                alt={artist.title}
              />
              {artist.title}
            </DropdownMenuLabel>
            {artistSeasons.map((season) => (
              <DropdownMenuCheckboxItem
                key={season}
                checked={
                  isEqual(artist.id, props.artist ?? undefined) &&
                  value.includes(season)
                }
                onCheckedChange={(checked) =>
                  handleChange(artist.id, season, checked)
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
