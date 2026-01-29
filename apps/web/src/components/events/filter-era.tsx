import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArtists } from "@/hooks/use-artists";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { erasForFilterQuery } from "@/lib/queries/events";
import { cn } from "@/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Props = {
  era: EventsFilters["era"];
  artist: EventsFilters["artist"];
  onChange: SetEventsFilters;
};

export default function EventsEraFilter({ era, artist, onChange }: Props) {
  const { data: eras } = useSuspenseQuery(erasForFilterQuery);
  const { artistList, selectedIds } = useArtists();
  const [open, setOpen] = useState(false);

  const groupedEras = useMemo(() => {
    const filtered = eras.filter((e) => {
      if (artist) return e.artist === artist;
      if (selectedIds.length > 0) return selectedIds.includes(e.artist);
      return true;
    });

    const groups = new Map<
      string,
      { artist: (typeof artistList)[0]; eras: typeof eras }
    >();

    for (const e of filtered) {
      const artistData = artistList.find((a) => a.id === e.artist);
      if (!artistData) continue;

      if (!groups.has(e.artist)) {
        groups.set(e.artist, { artist: artistData, eras: [] });
      }
      groups.get(e.artist)!.eras.push(e);
    }

    return Array.from(groups.values()).sort(
      (a, b) => a.artist.comoTokenId - b.artist.comoTokenId,
    );
  }, [eras, artist, selectedIds, artistList]);

  const selectedEra = era ? eras.find((e) => e.id === era) : undefined;

  function handleChange(eraId: string, checked: boolean) {
    onChange({
      era: checked ? eraId : undefined,
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2",
            era && "border-cosmo dark:border-cosmo",
          )}
        >
          {selectedEra ? (
            <>
              {(selectedEra.imageUrl ?? selectedEra.spotifyAlbumArt) && (
                <img
                  src={
                    (selectedEra.imageUrl ??
                      selectedEra.spotifyAlbumArt) as string
                  }
                  alt={selectedEra.name}
                  className="size-4 rounded-xs"
                />
              )}
              <span>{selectedEra.name}</span>
            </>
          ) : (
            <span>{m.events_filter_era()}</span>
          )}
          <IconChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
        {groupedEras.map(({ artist: artistData, eras: artistEras }) => (
          <DropdownMenuGroup key={artistData.id}>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <img
                className="aspect-square size-4 rounded-full"
                src={artistData.logoImageUrl}
                alt={artistData.title}
              />
              {artistData.title}
            </DropdownMenuLabel>
            {artistEras.map((e) => (
              <DropdownMenuCheckboxItem
                key={e.id}
                checked={era === e.id}
                onCheckedChange={(checked) => handleChange(e.id, checked)}
              >
                {(e.imageUrl ?? e.spotifyAlbumArt) && (
                  <img
                    src={(e.imageUrl ?? e.spotifyAlbumArt) as string}
                    alt={e.name}
                    className="mr-2 size-4 rounded-xs"
                  />
                )}
                {e.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
