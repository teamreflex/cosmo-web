import { artistColors, cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import Image from "next/image";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type Props = {
  showArtists?: boolean;
  artists: CosmoArtistWithMembersBFF[];
  active: string | null;
  updateArtist: (artist: string) => void;
  updateMember: (member: string) => void;
};

export default function MemberFilter({
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
            artist.artistMembers.length > 5 &&
              "overflow-x-scroll xl:no-scrollbar"
          )}
        >
          {showArtists && (
            <MemberFilterButton
              displayName={artist.title}
              name={artist.name}
              image={artist.logoImageUrl}
              isActive={active === artist.name}
              setActive={updateArtist}
              color={artistColors[artist.name as ValidArtist]}
            />
          )}

          {artist.artistMembers
            .sort((a, b) => a.order - b.order)
            .map((member) => (
              <MemberFilterButton
                key={member.name}
                name={member.name}
                displayName={member.name}
                image={member.profileImageUrl}
                isActive={active === member.name}
                setActive={updateMember}
                color={member.primaryColorHex}
              />
            ))}
        </div>
      ))}
    </div>
  );
}

type MemberFilterButtonProps = {
  displayName: string;
  name: string;
  image: string;
  isActive: boolean;
  setActive: (name: string) => void;
  color?: string;
};

export function MemberFilterButton({
  displayName,
  name,
  image,
  isActive,
  setActive,
  color = "var(--color-cosmo)",
}: MemberFilterButtonProps) {
  return (
    <div
      style={{
        "--member-color": color,
      }}
      className="flex flex-col justify-center items-center"
    >
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActive(name)}
              className={cn(
                "rounded-full drop-shadow-sm cursor-pointer",
                isActive && "ring-3 ring-(--member-color)"
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
}

function MemberImage({ name, image }: { name: string; image: string }) {
  return (
    <div className="flex justify-center items-center relative h-10 w-10 bg-muted rounded-full overflow-hidden">
      <span>{name.charAt(0)}</span>
      <Image
        className="absolute rounded-full"
        src={image}
        alt={name}
        width={40}
        height={40}
        priority={true}
        quality={100}
      />
    </div>
  );
}
