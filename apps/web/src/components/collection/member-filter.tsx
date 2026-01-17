import { useArtists } from "@/hooks/use-artists";
import { artistColors, cn } from "@/lib/utils";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";

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
  const [openArtistId, setOpenArtistId] = useState<string | null>(null);
  const [lastOpenArtistId, setLastOpenArtistId] = useState<string | null>(null);
  const [lastCloseTime, setLastCloseTime] = useState<number>(0);

  // keep track of the last opened artist for exit animation
  const displayArtistId = openArtistId ?? lastOpenArtistId;
  const displayArtist = selected.find((a) => a.id === displayArtistId);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setOpenArtistId(null);
      setLastCloseTime(Date.now());
    }
  }

  function handleOpen(artistId: string) {
    const now = Date.now();
    const timeSinceClose = now - lastCloseTime;

    // if clicking the currently open artist, manually close it
    if (openArtistId === artistId) {
      setOpenArtistId(null);
      setLastCloseTime(now);
      return;
    }

    // if we just closed (within 300ms) and clicking the same artist that was open,
    // this is part of the close event, ignore it
    if (
      openArtistId === null &&
      lastOpenArtistId === artistId &&
      timeSinceClose < 300
    ) {
      return;
    }

    // if switching to a different artist, let the popover close first, then open new one
    if (openArtistId !== null && openArtistId !== artistId) {
      setOpenArtistId(null);
      setLastCloseTime(now);
      // open the new artist after a brief delay to allow close animation
      setTimeout(() => {
        setOpenArtistId(artistId);
        setLastOpenArtistId(artistId);
      }, 10);
      return;
    }

    // otherwise, open the popover immediately
    setOpenArtistId(artistId);
    setLastOpenArtistId(artistId);
  }

  return (
    <Popover open={openArtistId !== null} onOpenChange={handleOpenChange}>
      <div className="relative flex h-fit w-full items-center justify-center gap-2 py-1">
        {/* anchor at the center */}
        <PopoverAnchor asChild>
          <div className="pointer-events-none absolute top-[44px] left-1/2 h-px w-px -translate-x-1/2" />
        </PopoverAnchor>

        {selected
          .sort((a, b) => a.comoTokenId - b.comoTokenId)
          .map((artist) => (
            <ArtistTriggerButton
              key={artist.id}
              artist={artist}
              active={active ?? null}
              isOpen={openArtistId === artist.id}
              onOpen={() => handleOpen(artist.id)}
            />
          ))}
      </div>

      {displayArtist && (
        <ArtistPopoverContent
          artist={displayArtist}
          openArtistId={openArtistId}
          active={active ?? null}
          showArtists={showArtists}
          onArtistSelect={updateArtist}
          onMemberSelect={updateMember}
          onClose={() => setOpenArtistId(null)}
        />
      )}
    </Popover>
  );
}

type ArtistTriggerButtonProps = {
  artist: CosmoArtistWithMembersBFF;
  active: string | null;
  isOpen: boolean;
  onOpen: () => void;
};

function ArtistTriggerButton(props: ArtistTriggerButtonProps) {
  const isArtistActive = props.active === props.artist.id;
  const isMemberActive =
    props.artist.artistMembers.findIndex((m) => m.name === props.active) !== -1;
  const isActive = props.isOpen || isArtistActive || isMemberActive;
  const artistColor = artistColors[props.artist.name as ValidArtist];

  function handlePointerDown(e: React.PointerEvent) {
    // prevent this from being detected as clicking outside
    e.preventDefault();
    props.onOpen();
  }

  return (
    <MemberFilterButton
      name={props.artist.title}
      image={props.artist.logoImageUrl}
      isActive={isActive}
      color={artistColor}
      onPointerDown={handlePointerDown}
      data-artist-trigger="true"
      data-artist-id={props.artist.id}
    />
  );
}

type ArtistPopoverContentProps = {
  artist: CosmoArtistWithMembersBFF;
  openArtistId: string | null;
  active: string | null;
  showArtists?: boolean;
  onArtistSelect: (artist: string) => void;
  onMemberSelect: (member: string) => void;
  onClose: () => void;
};

function ArtistPopoverContent(props: ArtistPopoverContentProps) {
  const isArtistActive = props.active === props.artist.id;
  const artistColor = artistColors[props.artist.name as ValidArtist];

  function handleArtistSelect(artist: string) {
    props.onArtistSelect(artist);
    props.onClose();
  }

  function handleMemberSelect(member: string) {
    props.onMemberSelect(member);
    props.onClose();
  }

  function handlePointerDownOutside(e: Event) {
    const target = e.target as HTMLElement;
    const triggerButton = target.closest("[data-artist-trigger]");

    if (triggerButton) {
      // get the artist id from the trigger button
      const clickedArtistId = triggerButton.getAttribute("data-artist-id");

      // only prevent close if clicking the same artist that's currently open
      // this prevents the flicker on same-artist clicks
      // but allows close/reopen animation when switching artists
      if (clickedArtistId === props.openArtistId) {
        e.preventDefault();
      }
    }
  }

  return (
    <PopoverContent
      style={{
        "--artist-color": artistColor,
      }}
      align="center"
      side="bottom"
      onPointerDownOutside={handlePointerDownOutside}
      className="z-20 member-filter-scrollbar flex w-fit max-w-[95vw] flex-row items-center justify-items-start gap-2 overflow-x-auto rounded-lg border-transparent bg-(--artist-color/0.15) px-2 py-1 backdrop-blur-[30px] backdrop-brightness-[1.3] backdrop-saturate-160 xl:justify-center"
    >
      {props.showArtists === true && (
        <MemberFilterButton
          name={props.artist.title}
          image={props.artist.logoImageUrl}
          isActive={isArtistActive}
          color={artistColor}
          onClick={() => handleArtistSelect(props.artist.name)}
          useLabel
        />
      )}

      {props.artist.artistMembers.map((member) => (
        <MemberFilterButton
          key={member.name}
          name={member.name}
          image={member.profileImageUrl}
          isActive={member.name === props.active}
          color={member.primaryColorHex}
          onClick={() => handleMemberSelect(member.name)}
          useLabel
        />
      ))}
    </PopoverContent>
  );
}

type MemberFilterButtonProps = React.ComponentPropsWithRef<"button"> & {
  name: string;
  image: string;
  isActive: boolean;
  color?: string;
  useLabel?: boolean;
};

function MemberFilterButton({
  name,
  image,
  isActive,
  color,
  ref,
  style,
  className,
  useLabel = false,
  ...props
}: MemberFilterButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <button
        {...props}
        ref={ref}
        style={{
          ...style,
          "--member-color": color ?? "var(--color-cosmo)",
        }}
        className={cn(
          "rounded-full ring-3 ring-transparent drop-shadow-sm transition-shadow focus:outline-none",
          isActive && "ring-(--member-color)",
          className,
        )}
      >
        <MemberImage name={name} image={image} />
      </button>
      {useLabel && (
        <span className="text-xs text-white [text-shadow:0_0_10px_rgb(0_0_0/60%),0_0_2px_rgb(0_0_0/80%),0_1px_2px_rgb(0_0_0/100%)]">
          {name}
        </span>
      )}
    </div>
  );
}

type MemberImageProps = {
  name: string;
  image: string;
};

function MemberImage(props: MemberImageProps) {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
      <span>{props.name.charAt(0)}</span>
      <img
        className="absolute size-10 rounded-full text-[0px]"
        src={props.image}
        alt={props.name}
      />
    </div>
  );
}
