import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconWaveSine } from "@tabler/icons-react";
import type { MouseEvent } from "react";

type Props = {
  playing: boolean;
  onToggle: () => void;
};

/**
 * Play button for collections with hasAudio=true. Toggles whether the parent
 * renders the unmuted frontMedia video in place of the static front image.
 */
export default function ObjektAudio({ playing, onToggle }: Props) {
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // don't trigger the parent FlippableObjekt's flip
    e.stopPropagation();
    onToggle();
  }

  return (
    <div
      className={cn(
        "group absolute top-0 left-0 isolate flex h-7 w-7 gap-2 rounded-br-photocard p-1 transition-all sm:h-9 sm:w-9 sm:p-2",
        "bg-(--objekt-background-color) text-(--objekt-text-color)",
      )}
    >
      <button
        className="z-50 flex items-center place-self-end transition-all hover:scale-110 focus:outline-none"
        onClick={handleClick}
        aria-label={playing ? m.aria_pause_audio() : m.aria_play_audio()}
      >
        <IconWaveSine
          className={cn("h-5 w-5", playing && "animate-audio-pulse")}
        />
      </button>
    </div>
  );
}
