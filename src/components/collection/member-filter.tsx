import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CollectionFilters } from "@/hooks/use-collection-filters";
import {
  CosmoArtistWithMembers,
  CosmoMember,
} from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import Image from "next/image";
import Skeleton from "../skeleton/skeleton";

type Props = {
  artists: CosmoArtistWithMembers[];
  filters: CollectionFilters;
  updateFilters: (filters: CollectionFilters) => void;
};

export default function MemberFilter({
  artists,
  filters,
  updateFilters,
}: Props) {
  function setActiveMember(member: CosmoMember) {
    updateFilters({
      ...filters,
      artist: undefined,
      member: filters.member === member.name ? undefined : member.name,
    });
  }

  function setActiveArtist(artist: CosmoArtistWithMembers) {
    updateFilters({
      ...filters,
      member: undefined,
      artist:
        filters.artist === artist.name
          ? undefined
          : (artist.name as ValidArtist),
    });
  }

  return (
    <div className="relative flex flex-col h-fit w-full">
      <div className="absolute pointer-events-none z-20 top-0 left-0 h-full w-4 bg-gradient-to-r from-background to-transparent" />
      <div className="absolute pointer-events-none z-20 top-0 right-0 h-full w-4 bg-gradient-to-l from-background to-transparent" />

      {artists.map((artist) => (
        <div
          key={artist.name}
          className="flex flex-row z-10 gap-2 p-1 sm:justify-center justify-items-start overflow-x-scroll no-scrollbar"
        >
          <MemberFilterButton
            displayName={artist.title}
            image={artist.logoImageUrl}
            isActive={filters.artist === artist.name}
            setActive={() => setActiveArtist(artist)}
          />

          {artist.members
            .sort((a, b) => a.order - b.order)
            .map((member) => (
              <MemberFilterButton
                key={member.name}
                displayName={member.name}
                image={member.profileImageUrl}
                isActive={filters.member === member.name}
                setActive={() => setActiveMember(member)}
              />
            ))}
        </div>
      ))}
    </div>
  );
}

type MemberFilterButtonProps = {
  displayName: string;
  image: string;
  isActive: boolean;
  setActive: () => void;
};
export function MemberFilterButton({
  displayName,
  image,
  isActive,
  setActive,
}: MemberFilterButtonProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          onClick={() => setActive()}
          className={cn(
            "rounded-full drop-shadow-lg",
            isActive && "ring ring-cosmo"
          )}
        >
          <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
            {/* fallback */}
            {!imageLoaded && (
              <div className="flex h-full w-full rounded-full bg-accent animate-pulse" />
            )}

            {/* image */}
            <div className="aspect-square h-full w-full">
              <Image
                src={image}
                alt={displayName}
                onLoad={() => setImageLoaded(true)}
                quality={100}
                width={40}
                height={40}
              />
            </div>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{displayName}</TooltipContent>
    </Tooltip>
  );
}
