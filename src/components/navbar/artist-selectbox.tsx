import { useId } from "react";
import { Check, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { setSelectedArtist } from "./actions";
import type { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { useArtists } from "@/hooks/use-artists";

export default function ArtistSelectbox() {
  const id = useId();
  const { artists, selected, selectedIds } = useArtists();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          className="flex items-center -space-x-3 focus:outline-none"
        >
          {selected.map((artist) => (
            <Avatar
              key={artist.id}
              className="size-8 ring ring-accent rounded-full"
            >
              <AvatarFallback className="rounded-full">A</AvatarFallback>
              <AvatarImage src={artist.logoImageUrl} />
            </Avatar>
          ))}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {artists
          .sort((a, b) => a.comoTokenId - b.comoTokenId)
          .map((artist) => (
            <ArtistItem
              key={artist.id}
              artist={artist}
              isSelected={selectedIds.includes(artist.id)}
            />
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ArtistItemProps = {
  artist: CosmoArtistBFF;
  isSelected: boolean;
};

export function ArtistItem({ artist, isSelected }: ArtistItemProps) {
  const mutation = useMutation({
    mutationFn: useServerFn(setSelectedArtist),
  });

  function handleSelect(artistId: string) {
    mutation.mutate({ data: artistId });
  }

  return (
    <DropdownMenuItem
      key={artist.id}
      onClick={(e) => {
        e.preventDefault();
        handleSelect(artist.id);
      }}
      disabled={mutation.isPending}
      className="min-w-40"
    >
      <img
        className="rounded-full size-6 aspect-square"
        src={artist.logoImageUrl}
        alt={artist.title}
      />

      <span className="grow">{artist.title}</span>

      <div className="flex items-center aspect-square justify-end">
        {mutation.isPending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : isSelected ? (
          <Check className="size-5" />
        ) : (
          <div className="size-5" />
        )}
      </div>
    </DropdownMenuItem>
  );
}
