import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCosmoArtists } from "@/hooks/use-cosmo-artist";
import Image from "next/image";
import { useSelectedArtists } from "@/hooks/use-selected-artists";
import { useFilterData } from "@/hooks/use-filter-data";

type Props = PropsWithFilters<"season">;

export default function SeasonFilter({ filters, setFilters }: Props) {
  const { getArtist } = useCosmoArtists();
  const selectedArtists = useSelectedArtists();
  const { seasons } = useFilterData();
  const [open, setOpen] = useState(false);

  function onChange(property: string, checked: boolean) {
    const newFilters = checked
      ? [...(filters ?? []), property]
      : (filters ?? []).filter((f) => f !== property);

    setFilters({
      season: newFilters.length > 0 ? newFilters : null,
    });
  }

  const data = seasons
    .map(({ artistId, seasons }) => {
      const artist = getArtist(artistId)!;
      return {
        artist,
        seasons,
      };
    })
    .filter(({ artist }) => selectedArtists.includes(artist.id));

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex gap-2 items-center",
            filters && filters.length > 0 && "dark:border-cosmo border-cosmo"
          )}
        >
          <span>Season</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-row gap-2">
        {data.map(({ artist, seasons }) => (
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
            {seasons.map((season) => (
              <DropdownMenuCheckboxItem
                key={season}
                checked={filters?.includes(season)}
                onCheckedChange={(checked) => onChange(season, checked)}
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
