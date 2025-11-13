import { Fragment, type PropsWithChildren, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { PauseCircle, PlayCircle } from "lucide-react";

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
        "relative bg-secondary w-full aspect-photocard object-contain touch-manipulation transition-transform transform-3d transform-gpu duration-500 data-[flipped=true]:rotate-y-180 rounded-2xl",
        !flipped && "will-change-transform"
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
      <div className="absolute inset-0 backface-hidden rotate-y-180">
        <Image
          src={collection.backImage}
          fill={true}
          alt={collection.collectionId}
          unoptimized
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
      <Image src={props.src} fill={true} alt={props.alt} unoptimized />
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
  const [playing, setPlaying] = useState(true);

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
        <Image src={props.imageSrc} fill={true} alt={props.alt} unoptimized />
      )}

      {props.children}
      <div
        className={cn(
          "group absolute bottom-0 left-0 isolate flex h-7 w-7 gap-2 rounded-tr-lg rounded-bl-2xl p-1 transition-all sm:h-9 sm:w-9 sm:rounded-tr-xl sm:rounded-bl-xl sm:p-2",
          "bg-(--objekt-background-color) text-(--objekt-text-color)"
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
