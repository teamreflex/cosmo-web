import { Fragment, useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";

type Props = PropsWithChildren<{
  collection: Objekt.Collection;
}>;

/**
 * Flips on click.
 * Used for:
 * - Inside a MetadataDialog
 * - Upon grid reward
 * - When scanning an objekt
 */
export default function FlippableObjekt({ children, collection }: Props) {
  const [flipped, setFlipped] = useState(false);

  // start prefetching the video if it exists
  // if (collection.frontMedia !== null) {
  //   const video = document.createElement("video");
  //   video.src = collection.frontMedia;
  //   video.load();
  // }

  return (
    <div
      role="button"
      style={{
        "--objekt-background-color": collection.backgroundColor,
        "--objekt-text-color": collection.textColor,
      }}
      data-flipped={flipped}
      onClick={() => setFlipped((prev) => !prev)}
      className={cn(
        "relative aspect-photocard w-full transform-gpu touch-manipulation rounded-2xl bg-secondary object-contain transition-transform duration-500 transform-3d data-[flipped=true]:rotate-y-180",
        !flipped && "will-change-transform",
      )}
    >
      {/* front */}
      <div className="absolute inset-0 backface-hidden">
        {collection.frontMedia !== null ? (
          <FrontVideo
            imageSrc={collection.frontImage}
            videoSrc={collection.frontMedia}
            alt={collection.collectionId}
          >
            {children}
          </FrontVideo>
        ) : (
          <FrontImage src={collection.frontImage} alt={collection.collectionId}>
            {children}
          </FrontImage>
        )}
      </div>

      {/* back */}
      <div className="absolute inset-0 rotate-y-180 backface-hidden">
        <img
          className="absolute"
          src={collection.backImage}
          alt={collection.collectionId}
        />
      </div>
    </div>
  );
}

type FrontImageProps = PropsWithChildren<{
  src: string;
  alt: string;
}>;

/**
 * Every objekt except Motion class.
 */
function FrontImage(props: FrontImageProps) {
  return (
    <Fragment>
      <img className="absolute" src={props.src} alt={props.alt} />
      {props.children}
    </Fragment>
  );
}

type FrontVideoProps = PropsWithChildren<{
  imageSrc: string;
  videoSrc: string;
  alt: string;
}>;

/**
 * Motion class objekts have videos.
 */
function FrontVideo(props: FrontVideoProps) {
  const [playing, setPlaying] = useState(false);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setPlaying((prev) => !prev);
  }

  return (
    <Fragment>
      {playing ? (
        <video
          className="absolute overflow-hidden rounded-2xl"
          src={props.videoSrc}
          autoPlay
          loop
        />
      ) : (
        <img className="absolute" src={props.imageSrc} alt={props.alt} />
      )}

      {props.children}
      <div
        className={cn(
          "group absolute bottom-0 left-0 isolate flex h-7 w-7 gap-2 rounded-tr-lg rounded-bl-2xl p-1 transition-all sm:h-9 sm:w-9 sm:rounded-tr-xl sm:rounded-bl-xl sm:p-2",
          "bg-(--objekt-background-color) text-(--objekt-text-color)",
        )}
      >
        <button
          className="z-50 flex items-center place-self-end transition-all hover:scale-110 focus:outline-none"
          onClick={handleClick}
        >
          {playing ? (
            <PauseCircle className="h-5 w-5" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
        </button>
      </div>
    </Fragment>
  );
}
