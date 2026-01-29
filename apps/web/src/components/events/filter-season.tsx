import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { isEqual } from "@apollo/util";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  seasons: EventsFilters["season"];
  artist: EventsFilters["artist"];
  onChange: SetEventsFilters;
};

export default function EventsSeasonFilter({
  seasons,
  artist,
  onChange,
}: Props) {
  const { seasons: seasonsData } = useFilterData();
  const [open, setOpen] = useState(false);

  const value = seasons ?? [];

  function handleChange(artistId: string, season: string, checked: boolean) {
    onChange((prev) => {
      if (prev.artist !== artistId) {
        return {
          artist: artistId as ValidArtist,
          season: [season],
          era: undefined,
        };
      }

      const newSeasons = checked
        ? [...(prev.season ?? []), season]
        : (prev.season ?? []).filter((s) => s !== season);

      return {
        artist: newSeasons.length > 0 ? artistId : undefined,
        season: newSeasons.length > 0 ? newSeasons : undefined,
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
          <IconChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex w-fit flex-row gap-2" align="end">
        {seasonsData.map(({ artist: artistData, seasons: artistSeasons }) => (
          <DropdownMenuGroup key={artistData.id}>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <img
                className="aspect-square size-4 rounded-full"
                src={artistData.logoImageUrl}
                alt={artistData.title}
              />
              {artistData.title}
            </DropdownMenuLabel>
            {artistSeasons.map((season) => (
              <DropdownMenuCheckboxItem
                key={season}
                checked={
                  isEqual(artistData.id, artist ?? undefined) &&
                  value.includes(season)
                }
                onCheckedChange={(checked) =>
                  handleChange(artistData.id, season, checked)
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
