import {
  CosmoArtistWithMembers,
  CosmoMember,
  ValidArtist,
} from "@/lib/universal/cosmo";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CollectionFilters } from "@/hooks/use-collection-filters";

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
    <div className="flex flex-row gap-2 pt-1 pb-1 px-1 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
      {artists.map((artist) => (
        <MemberFilterButton
          key={artist.name}
          displayName={artist.title}
          image={artist.logoImageUrl}
          isActive={filters.artist === artist.name}
          setActive={() => setActiveArtist(artist)}
        />
      ))}

      {artists.map((artist) => (
        <Fragment key={artist.name}>
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
        </Fragment>
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
          <Avatar>
            <AvatarFallback>{displayName.at(0)}</AvatarFallback>
            <AvatarImage src={image} alt={displayName} />
          </Avatar>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{displayName}</TooltipContent>
    </Tooltip>
  );
}
