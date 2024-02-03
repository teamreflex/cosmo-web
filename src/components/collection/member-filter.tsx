import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { memo } from "react";
import Image from "next/image";

type Props = {
  showArtists?: boolean;
  artists: CosmoArtistWithMembers[];
  active: string | null;
  updateArtist: (artist: string) => void;
  updateMember: (member: string) => void;
};

export default memo(function MemberFilter({
  showArtists = true,
  artists,
  active,
  updateArtist,
  updateMember,
}: Props) {
  return (
    <div className="relative flex flex-col h-fit w-full">
      <div className="absolute pointer-events-none z-20 top-0 left-0 h-full w-4 bg-gradient-to-r from-background to-transparent" />
      <div className="absolute pointer-events-none z-20 top-0 right-0 h-full w-4 bg-gradient-to-l from-background to-transparent" />

      {artists.map((artist) => (
        <div
          key={artist.name}
          className="flex flex-row z-10 gap-2 p-1 sm:justify-center justify-items-start overflow-x-scroll no-scrollbar"
        >
          {showArtists && (
            <MemberFilterButton
              displayName={artist.title}
              name={artist.name}
              image={artist.logoImageUrl}
              isActive={active === artist.name}
              setActive={updateArtist}
            />
          )}

          {artist.members
            .sort((a, b) => a.order - b.order)
            .map((member) => (
              <MemberFilterButton
                key={member.name}
                name={member.name}
                displayName={member.name}
                image={member.profileImageUrl}
                isActive={active === member.name}
                setActive={updateMember}
              />
            ))}
        </div>
      ))}
    </div>
  );
});

type MemberFilterButtonProps = {
  displayName: string;
  name: string;
  image: string;
  isActive: boolean;
  setActive: (name: string) => void;
};
export const MemberFilterButton = memo(function MemberFilterButton({
  displayName,
  name,
  image,
  isActive,
  setActive,
}: MemberFilterButtonProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setActive(name)}
            className={cn(
              "rounded-full drop-shadow-lg",
              isActive && "ring ring-cosmo"
            )}
          >
            <MemberImage name={displayName} image={image} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{displayName}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

const MemberImage = memo(function MemberImage({
  name,
  image,
}: {
  name: string;
  image: string;
}) {
  return (
    <div className="flex justify-center items-center relative h-10 w-10 bg-muted rounded-full overflow-hidden">
      <span>{name.charAt(0)}</span>
      <Image
        src={image}
        alt={name}
        fill={true}
        priority={true}
        className="rounded-full"
      />
    </div>
  );
});
