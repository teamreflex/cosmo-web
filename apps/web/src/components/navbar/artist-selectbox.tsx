import { useArtists } from "@/hooks/use-artists";
import { selectedArtistsQuery } from "@/lib/queries/core";
import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { $setSelectedArtist } from "./actions";

export default function ArtistSelectbox() {
  const id = useId();
  const { artistList, selected, selectedIds } = useArtists();

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
              className="size-8 rounded-full ring ring-accent"
            >
              <AvatarFallback className="rounded-full">A</AvatarFallback>
              <AvatarImage src={artist.logoImageUrl} />
            </Avatar>
          ))}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        {artistList
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
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["set-selected-artist", artist.id],
    mutationFn: $setSelectedArtist,
  });

  function handleSelect(artistId: string) {
    mutation.mutate(
      { data: { artist: artistId } },
      {
        onSuccess: (newSelected) => {
          queryClient.setQueryData(selectedArtistsQuery.queryKey, newSelected);
        },
      },
    );
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
        className="aspect-square size-6 rounded-full"
        src={artist.logoImageUrl}
        alt={artist.title}
      />

      <span className="grow">{artist.title}</span>

      <div className="flex aspect-square items-center justify-end">
        {mutation.isPending ? (
          <IconLoader2 className="size-5 animate-spin" />
        ) : isSelected ? (
          <IconCheck className="size-5" />
        ) : (
          <div className="size-5" />
        )}
      </div>
    </DropdownMenuItem>
  );
}
