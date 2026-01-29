import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArtists } from "@/hooks/use-artists";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  artist: EventsFilters["artist"];
  onChange: SetEventsFilters;
};

export default function EventsArtistFilter({ artist, onChange }: Props) {
  const { artistList } = useArtists();
  const [open, setOpen] = useState(false);

  function handleChange(artistId: string, checked: boolean) {
    onChange({
      artist: checked ? (artistId as ValidArtist) : undefined,
      season: undefined,
      era: undefined,
    });
  }

  const selectedArtist = artist
    ? artistList.find((a) => a.id === artist)
    : undefined;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2",
            artist && "border-cosmo dark:border-cosmo",
          )}
        >
          {selectedArtist ? (
            <>
              <img
                src={selectedArtist.logoImageUrl}
                alt={selectedArtist.title}
                className="size-4 rounded-full"
              />
              <span>{selectedArtist.title}</span>
            </>
          ) : (
            <span>{m.objekt_attribute_artist()}</span>
          )}
          <IconChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {artistList.map((a) => (
          <DropdownMenuCheckboxItem
            key={a.id}
            checked={artist === a.id}
            onCheckedChange={(checked) => handleChange(a.id, checked)}
          >
            <img
              src={a.logoImageUrl}
              alt={a.title}
              className="mr-2 size-4 rounded-full"
            />
            {a.title}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
