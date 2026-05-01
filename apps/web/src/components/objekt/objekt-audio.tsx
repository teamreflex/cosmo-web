import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconWaveSine } from "@tabler/icons-react";
import { Fragment, useRef, useState, type MouseEvent } from "react";

type Props = {
  src: string;
};

/**
 * Play button for collections with hasAudio=true.
 * Plays the audio track of the collection's frontMedia .mp4 in a loop.
 */
export default function ObjektAudio({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    // don't trigger the parent FlippableObjekt's flip
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  return (
    <Fragment>
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div
        className={cn(
          "group absolute top-0 left-0 isolate flex h-7 w-7 gap-2 rounded-br-photocard p-1 transition-all sm:h-9 sm:w-9 sm:p-2",
          "bg-(--objekt-background-color) text-(--objekt-text-color)",
        )}
      >
        <button
          className="z-50 flex items-center place-self-end transition-all hover:scale-110 focus:outline-none"
          onClick={toggle}
          aria-label={playing ? m.aria_pause_audio() : m.aria_play_audio()}
        >
          <IconWaveSine
            className={cn("h-5 w-5", playing && "animate-audio-pulse")}
          />
        </button>
      </div>
    </Fragment>
  );
}
