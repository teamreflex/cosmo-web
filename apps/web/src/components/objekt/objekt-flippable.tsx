import { CARD_EDGE_COLOR, useCardFlip } from "@/hooks/use-card-flip";
import { m } from "@/i18n/messages";
import {
  getObjektBackImageUrl,
  getObjektFrontImageUrl,
} from "@/lib/client/objekt-util";
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
  const frontImage = getObjektFrontImageUrl(collection, "grid");

  const Image = (
    <ObjektImage src={frontImage} alt={collection.collectionId}>
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
        // vertical swipes still scroll the page on touch, which cancels the drag and settles the card
        className="relative aspect-photocard w-full touch-pan-y object-contain select-none focus:outline-none"
      >
        {/*
         * the card's own thickness, swept between the two faces. The edge
         * spills past the card as it turns, drawn by overflow-visible so it
         * never widens a scroll container the way a larger box would
         */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-visible"
        >
          <path ref={edgeRef} d="" fill={CARD_EDGE_COLOR} />
        </svg>

        {/* front */}
        <div
          ref={frontRef}
          className="absolute inset-0 rounded-photocard will-change-transform [clip-path:inset(0_round_--theme(--radius-photocard))]"
        >
          {collection.frontMedia && !collection.hasAudio ? (
            <ErrorBoundary fallback={Image}>
              <Suspense fallback={Image}>
                <ObjektVideo
                  imageSrc={frontImage}
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
                  imageSrc={frontImage}
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
            <ObjektImage src={frontImage} alt={collection.collectionId}>
              {audioButton}
              {children}
            </ObjektImage>
          )}
        </div>

        {/* back — hidden until the card turns past edge-on */}
        <div
          ref={backRef}
          className="invisible absolute inset-0 overflow-hidden rounded-photocard will-change-transform"
        >
          {hasBackImage ? (
            <img
              className="absolute"
              src={getObjektBackImageUrl(collection)}
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
