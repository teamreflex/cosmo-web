"use client";

import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { useId, useState, useTransition } from "react";
import { setSelectedArtist } from "./actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type Props = {
  artists: CosmoArtistBFF[];
  selected?: string[];
};

export default function ArtistSelectbox({ artists, selected = [] }: Props) {
  const id = useId();
  const [state, setState] = useState(() =>
    artists.map((a) => a.id).filter((artist) => selected.includes(artist))
  );

  function handleSelect(artistId: ValidArtist) {
    setState((prev) => {
      if (prev.includes(artistId)) {
        return [...prev].filter((a) => a !== artistId);
      }

      return [...prev, artistId];
    });
  }

  const selectedArtists =
    selected.length > 0
      ? artists.filter((a) => selected.includes(a.id))
      : artists;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button id={id} className="flex items-center ml-auto -space-x-3">
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
              onSelect={handleSelect}
              isSelected={state.includes(artist.id)}
            />
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ArtistItemProps = {
  artist: CosmoArtistBFF;
  onSelect: (artistId: ValidArtist) => void;
  isSelected: boolean;
};

function ArtistItem({ artist, onSelect, isSelected }: ArtistItemProps) {
  const [isPending, startTransition] = useTransition();

  function handleSelect(artist: CosmoArtistBFF) {
    onSelect(artist.id);
    startTransition(async () => {
      await setSelectedArtist(artist.id);
    });
  }

  return (
    <DropdownMenuItem
      key={artist.id}
      onClick={(e) => {
        e.preventDefault();
        handleSelect(artist);
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
