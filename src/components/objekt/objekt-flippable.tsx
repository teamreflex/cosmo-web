import { Fragment, type PropsWithChildren, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import ReactPlayer from "react-player";

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
        "relative w-full aspect-photocard object-contain touch-manipulation transition-transform transform-3d transform-gpu duration-500 data-[flipped=true]:rotate-y-180 rounded-2xl focus:outline-none",
        !flipped && "will-change-transform"
      )}
    >
      {/* front */}
      <div className="absolute inset-0 backface-hidden">
        {collection.frontMedia ? (
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
  return (
    <Fragment>
      <div className="absolute inset-0 w-full h-full bg-secondary rounded-2xl animate-pulse" />
      <ReactPlayer
        className="absolute overflow-hidden rounded-2xl"
        style={{ width: "100%", height: "auto", aspectRatio: "5.5 / 8.5" }}
        src={props.videoSrc}
        preload="auto"
        playsInline={true}
        loop={true}
        muted={true}
        autoPlay={true}
        controls={false}
      />
      {props.children}
    </Fragment>
  );
}
