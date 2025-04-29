"use client";

import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { useId } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  useSelectedArtists,
  useUpdateSelectedArtists,
} from "@/hooks/use-selected-artists";
import { useCosmoArtists } from "@/hooks/use-cosmo-artist";

export default function ArtistSelectbox() {
  const id = useId();
  const { artists } = useCosmoArtists();
  const { selectedArtists, selectedIds } = useSelectedArtists();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          className="flex items-center -space-x-3 focus:outline-none"
        >
          {selectedArtists.map((artist) => (
            <Avatar
              key={artist.id}
              className="size-8 ring ring-accent rounded-full"
            >
              <AvatarFallback className="rounded-full">
                {artist.title.at(0)}
              </AvatarFallback>
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
  const { handleSelect, isPending } = useUpdateSelectedArtists();

  return (
    <DropdownMenuItem
      key={artist.id}
      onClick={(e) => {
        e.preventDefault();
        handleSelect(artist.id);
      }}
      disabled={isPending}
      className="min-w-40"
    >
      <Image
        className="rounded-full aspect-square"
        src={artist.logoImageUrl}
        alt={artist.title}
        width={24}
        height={24}
      />

      <span className="grow">{artist.title}</span>

      <div className="flex items-center aspect-square justify-end">
        {isPending ? (
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
