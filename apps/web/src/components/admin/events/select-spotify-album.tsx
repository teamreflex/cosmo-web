import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { $searchSpotifyAlbums } from "@/lib/server/events/actions";
import type { SpotifyAlbum } from "@/lib/universal/events";
import { cn } from "@/lib/utils";
import { IconCheck, IconLoader2, IconSelector } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { useDebounceValue } from "usehooks-ts";

type Props = {
  onSelect: (album: SpotifyAlbum) => void;
  selectedAlbum?: SpotifyAlbum | null;
  placeholder?: string;
  children?: ReactNode;
};

export default function SelectSpotifyAlbum({
  onSelect,
  selectedAlbum,
  placeholder = "Search Spotify albums...",
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 500);
  const { data, status } = useQuery({
    queryKey: ["spotify-albums", debouncedSearch],
    queryFn: () => $searchSpotifyAlbums({ data: { query: debouncedSearch } }),
    enabled: debouncedSearch.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const results = data ?? [];

  function handleInputClear() {
    setSearch("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        {children ?? (
          <Button
            data-placeholder={!selectedAlbum ? placeholder : undefined}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="group w-full justify-between"
            onClick={() => setOpen(true)}
          >
            <span className="truncate group-data-placeholder:text-muted-foreground">
              {selectedAlbum
                ? `${selectedAlbum.name} - ${selectedAlbum.artists[0]?.name}`
                : placeholder}
            </span>
            <IconSelector className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search Spotify albums..."
            onClose={handleInputClear}
          />
          <CommandList>
            {status === "pending" && debouncedSearch.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <IconLoader2 className="size-4 animate-spin" />
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center justify-center gap-2 py-4">
                <p className="text-sm font-semibold">
                  Error searching Spotify albums
                </p>
              </div>
            )}

            {debouncedSearch.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                Type to search albums...
              </div>
            )}

            {status === "success" && results.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm font-semibold">
                No albums found
              </div>
            )}

            <CommandGroup>
              {results.map((album) => (
                <CommandItem
                  className="cursor-pointer"
                  key={album.id}
                  value={album.id}
                  onSelect={() => {
                    onSelect(album);
                    setOpen(false);
                  }}
                >
                  <IconCheck
                    className={cn(
                      "mr-2 size-4",
                      selectedAlbum?.id === album.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex items-center gap-3">
                    {album.images[2] && (
                      <img
                        src={album.images[2].url}
                        alt={album.name}
                        className="size-10 rounded"
                      />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{album.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {album.artists.map((a) => a.name).join(", ")} •{" "}
                        {album.release_date.slice(0, 4)}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
