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
      <div className="absolute pointer-events-none z-20 top-0 left-0 h-full w-2 bg-linear-to-r from-background to-transparent" />
      <div className="absolute pointer-events-none z-20 top-0 right-0 h-full w-2 bg-linear-to-l from-background to-transparent" />

      {artists.map((artist) => (
        <div
          key={artist.name}
          className={cn(
            "flex flex-row z-10 gap-2 p-1 xl:justify-center justify-items-start",
            artist.members.length > 5 && "overflow-x-scroll xl:no-scrollbar"
          )}
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
    <div className="flex flex-col justify-center items-center">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActive(name)}
              className={cn(
                "rounded-full drop-shadow-sm",
                isActive && "ring-3 ring-cosmo"
              )}
            >
              <MemberImage name={displayName} image={image} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{displayName}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <p className="md:hidden text-xs text-foreground">{displayName}</p>
    </div>
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
        width={40}
        height={40}
        priority={true}
        quality={100}
        className="absolute rounded-full"
      />
    </div>
  );
});
