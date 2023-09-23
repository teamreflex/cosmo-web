import {
  CosmoArtistWithMembers,
  CosmoMember,
  ObjektQueryParams,
} from "@/lib/server/cosmo";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { ValidArtist } from "@/lib/server/cosmo/common";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
  artists: CosmoArtistWithMembers[];
  filters: ObjektQueryParams;
  updateFilters: (filters: ObjektQueryParams) => void;
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
    <div className="flex flex-row gap-2 pt-4 pb-1 h-fit sm:justify-center container px-4 overflow-x-scroll no-scrollbar">
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
function MemberFilterButton({
  displayName,
  image,
  isActive,
  setActive,
}: MemberFilterButtonProps) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger>
        <button
          onClick={() => setActive()}
          className={cn("rounded-full", isActive && "ring ring-violet-600")}
        >
          <Avatar>
            <AvatarFallback>{displayName}</AvatarFallback>
            <AvatarImage src={image} alt={displayName} />
          </Avatar>
        </button>
      </TooltipTrigger>
      <TooltipContent>{displayName}</TooltipContent>
    </Tooltip>
  );
}
