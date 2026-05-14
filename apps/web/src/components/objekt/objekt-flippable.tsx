import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { IconPhotoQuestion } from "@tabler/icons-react";
import { Fragment, useState, lazy, Suspense } from "react";
import type { PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ObjektAudio from "./objekt-audio";

const ObjektVideo = lazy(() => import("./objekt-video"));

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

  const hasBackImage = collection.backImage !== "";

  const Image = (
    <ObjektImage src={collection.frontImage} alt={collection.collectionId}>
      {children}
    </ObjektImage>
  );

  return (
    <div className="@container">
      <div
        role="button"
        aria-label={m.aria_flip_objekt()}
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        data-flipped={flipped}
        onClick={() => setFlipped((prev) => !prev)}
        className={cn(
          "relative aspect-photocard w-full transform-gpu touch-manipulation rounded-photocard object-contain transition-transform duration-500 transform-3d focus:outline-none data-[flipped=true]:rotate-y-180",
          !flipped && "will-change-transform",
        )}
      >
        {/* front */}
        <div className="absolute inset-0 overflow-hidden rounded-photocard backface-hidden">
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
          ) : (
            <ObjektImage
              src={collection.frontImage}
              alt={collection.collectionId}
            >
              {collection.hasAudio && collection.frontMedia && (
                <ObjektAudio src={collection.frontMedia} />
              )}
              {children}
            </ObjektImage>
          )}
        </div>

        {/* back */}
        {hasBackImage ? (
          <div className="absolute inset-0 rotate-y-180 rounded-photocard backface-hidden">
            <img
              className="absolute"
              src={collection.backImage}
              alt={collection.collectionId}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full rotate-y-180 rounded-photocard backface-hidden bg-accent">
            <IconPhotoQuestion className="w-1/3 h-auto aspect-square opacity-60" />
          </div>
        )}
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
