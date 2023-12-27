import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  CosmoArtistWithMembers,
  CosmoMember,
} from "@/lib/universal/cosmo/artists";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { memo } from "react";

type Props = {
  artists: CosmoArtistWithMembers[];
  active: string | undefined;
  updateArtist: (artist: CosmoArtistWithMembers) => void;
  updateMember: (member: CosmoMember) => void;
};

export default memo(function MemberFilter({
  artists,
  active,
  updateArtist,
  updateMember,
}: Props) {
  console.log("[render]: MemberFilter");

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
            isActive={active === artist.name}
            setActive={() => updateArtist(artist)}
          />

          {artist.members
            .sort((a, b) => a.order - b.order)
            .map((member) => (
              <MemberFilterButton
                key={member.name}
                displayName={member.name}
                image={member.profileImageUrl}
                isActive={active === member.name}
                setActive={() => updateMember(member)}
              />
            ))}
        </div>
      ))}
    </div>
  );
});

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
    <TooltipProvider>
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
    </TooltipProvider>
  );
}
