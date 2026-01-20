import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { Fragment, useState, lazy, Suspense } from "react";
import type { PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";

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

  const Image = (
    <ObjektImage src={collection.frontImage} alt={collection.collectionId}>
      {children}
    </ObjektImage>
  );

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
        "relative aspect-photocard w-full transform-gpu touch-manipulation rounded-2xl object-contain transition-transform duration-500 transform-3d focus:outline-none data-[flipped=true]:rotate-y-180",
        !flipped && "will-change-transform",
      )}
    >
      {/* front */}
      <div className="absolute inset-0 backface-hidden">
        {collection.frontMedia ? (
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
          Image
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
