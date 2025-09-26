import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { artistColors, cn } from "@/lib/utils";
import { useArtists } from "@/hooks/use-artists";

type Props = {
  showArtists?: boolean;
  active?: string | null;
  updateArtist: (artist: string) => void;
  updateMember: (member: string) => void;
};

export default function MemberFilter({
  showArtists = true,
  active,
  updateArtist,
  updateMember,
}: Props) {
  const { selected } = useArtists();

  return (
    <div className="relative flex flex-col h-fit w-full">
      <div className="absolute pointer-events-none z-20 top-0 left-0 h-full w-2 bg-linear-to-r from-background to-transparent" />
      <div className="absolute pointer-events-none z-20 top-0 right-0 h-full w-2 bg-linear-to-l from-background to-transparent" />

      {selected
        .sort((a, b) => b.comoTokenId - a.comoTokenId)
        .map((artist) => (
          <div
            key={artist.name}
            className={cn(
              "flex flex-row z-10 gap-2 p-1 xl:justify-center justify-items-start empty:hidden",
              artist.artistMembers.length > 5 &&
                "overflow-x-scroll xl:no-scrollbar",
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

function MemberFilterButton({
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActive(name)}
              className={cn(
                "rounded-full drop-shadow-sm",
                isActive && "ring-3 ring-(--member-color)",
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
      <img className="absolute rounded-full size-10" src={image} alt={name} />
    </div>
  );
}
