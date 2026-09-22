import { CARD_EDGE_COLOR, useCardFlip } from "@/hooks/use-card-flip";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { IconPhotoX } from "@tabler/icons-react";
import { Fragment, useState, lazy, Suspense } from "react";
import type { PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ObjektAudio from "./objekt-audio";

const ObjektVideo = lazy(() => import("./objekt-video"));

type Props = PropsWithChildren<{
  collection: Objekt.Collection;
}>;

/**
 * Drag to turn and tilt, flick to flip, tap to turn over.
 * Used for:
 * - Inside a MetadataDialog
 * - Upon grid reward
 * - When scanning an objekt
 */
export default function FlippableObjekt({ children, collection }: Props) {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const { sceneRef, frontRef, backRef, svgRef, edgeRef, flipped, handlers } =
    useCardFlip();

  const hasBackImage = collection.backImage !== "";

  const Image = (
    <ObjektImage src={collection.frontImage} alt={collection.collectionId}>
      {children}
    </ObjektImage>
  );

  const audioButton =
    collection.hasAudio && collection.frontMedia ? (
      <ObjektAudio
        playing={audioPlaying}
        onToggle={() => setAudioPlaying((p) => !p)}
      />
    ) : null;

  return (
    <div className="@container">
      <div
        ref={sceneRef}
        role="button"
        tabIndex={0}
        aria-label={m.aria_flip_objekt()}
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        data-flipped={flipped}
        {...handlers}
        className="relative aspect-photocard w-full touch-none object-contain select-none focus:outline-none"
      >
        {/* the card's own thickness, swept between the two faces */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute -top-1/2 -left-1/2 h-[200%] w-[200%] overflow-visible"
        >
          <path ref={edgeRef} d="" fill={CARD_EDGE_COLOR} />
        </svg>

        {/* front */}
        <div
          ref={frontRef}
          className="absolute inset-0 overflow-hidden rounded-photocard will-change-transform"
        >
          {collection.frontMedia && !collection.hasAudio ? (
            <ErrorBoundary fallback={Image}>
              <Suspense fallback={Image}>
                <ObjektVideo
                  imageSrc={collection.frontImage}
                  videoSrc={collection.frontMedia}
                  alt={collection.collectionId}
                >
                  {children}
                </ObjektVideo>
              </Suspense>
            </ErrorBoundary>
          ) : collection.frontMedia && collection.hasAudio && audioPlaying ? (
            <ErrorBoundary fallback={Image}>
              <Suspense fallback={Image}>
                <ObjektVideo
                  imageSrc={collection.frontImage}
                  videoSrc={collection.frontMedia}
                  alt={collection.collectionId}
                  muted={false}
                >
                  {audioButton}
                  {children}
                </ObjektVideo>
              </Suspense>
            </ErrorBoundary>
          ) : (
            <ObjektImage
              src={collection.frontImage}
              alt={collection.collectionId}
            >
              {audioButton}
              {children}
            </ObjektImage>
          )}
        </div>

        {/* back — hidden until the card turns past edge-on */}
        <div
          ref={backRef}
          className="absolute inset-0 overflow-hidden rounded-photocard opacity-0 will-change-transform"
        >
          {hasBackImage ? (
            <img
              className="absolute"
              src={collection.backImage}
              alt={collection.collectionId}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent">
              <IconPhotoX className="aspect-square h-auto w-1/3 opacity-60" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ObjektImageProps = PropsWithChildren<{
  src: string;
  alt: string;
}>;

/**
 * Every objekt except Motion class.
 */
function ObjektImage(props: ObjektImageProps) {
  return (
    <Fragment>
      <img className="absolute" src={props.src} alt={props.alt} />
      {props.children}
    </Fragment>
  );
}
