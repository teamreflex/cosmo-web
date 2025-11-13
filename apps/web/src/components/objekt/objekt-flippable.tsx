import { Fragment, useState } from "react";
import ReactPlayer from "react-player";
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
  return (
    <Fragment>
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
