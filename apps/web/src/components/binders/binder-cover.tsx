import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import {
  type BinderArtwork,
  type BinderPreview,
  type BinderPreviewImage,
  binderTextColour,
  COLLAGE_SIZE,
} from "@/lib/universal/binders";
import { cn } from "@/lib/utils";

type Props = {
  binder: Pick<BinderPreview, "name" | "colour" | "artwork">;
  /** hide the name where it's already shown beside the cover */
  label?: boolean;
  /** keep the top of the spine clear of the pin chip over that corner */
  pinned?: boolean;
  /** cover a whole page: stretch to the container and take its corners, instead of photocard shape */
  fill?: boolean;
  className?: string;
};

/**
 * A binder drawn at photocard shape: spine colour, spine shading, sleeve sheen,
 * the name running up a strip down the spine and the cover artwork centred
 * beside it. The artwork sits on a photocard-shaped face, and everything is
 * sized to the face in container units, so the same cover reads right from a
 * header thumbnail up to a shelf tile, and a cover stretched over a page of
 * another shape keeps the face at photocard shape, centred, with the strip
 * still down its edge.
 *
 * The name never drops below 10px, so it stays legible on a shelf, and the
 * strip widens to fit it. A page-sized cover flying in from a smaller one
 * scales that floor by `--cover-zoom`, so it's drawn as a blow-up of that
 * cover and the flight starts seamlessly over it.
 */
export default function BinderCover({
  binder,
  label = true,
  pinned = false,
  fill = false,
  className,
}: Props) {
  return (
    <div className={cn(fill ? "@container-size" : "@container", className)}>
      <div
        data-cover-board
        style={{ backgroundColor: binder.colour }}
        className={cn(
          "relative flex items-center justify-center overflow-hidden border border-white/8 shadow-[inset_2.5cqw_0_0_-1.25cqw_rgb(0_0_0/0.35),0_6cqw_12.5cqw_-6cqw_rgb(0_0_0/0.9)] before:absolute before:inset-y-0 before:left-0 before:w-[9cqw] before:bg-linear-to-r before:from-black/45 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(120deg,rgb(255_255_255/0.14),transparent_40%,transparent_70%,rgb(255_255_255/0.05))]",
          fill
            ? "h-full rounded-[inherit] [--face:min(100cqw,100cqh*var(--aspect-photocard))]"
            : "aspect-photocard rounded-l-[2.4cqw] rounded-r-photocard [--face:100cqw]",
          /**
           * The face's width and the strip's, resolved where they're used:
           * against the cover by the strip on the board, and against the
           * face by the artwork on it, which come to the same width.
           */
          label
            ? "[--spine:max(var(--face)*0.14,17px*var(--cover-zoom,1))]"
            : "[--spine:calc(var(--face)*0.14)]",
        )}
      >
        {/* on the board rather than the face, so it keeps to the edge of a page wider than the face */}
        <div
          data-cover-spine
          className={cn(
            "absolute inset-y-0 left-0 flex w-(--spine) origin-top-left flex-col items-center justify-end bg-black/14 pb-[calc(var(--face)*0.09)] shadow-[inset_-0.4cqw_0_0_rgb(0_0_0/0.22),0.4cqw_0_0_rgb(255_255_255/0.1)]",
            // the chip is a bar corner overlay, h-5 then sm:h-9
            pinned ? "pt-6 sm:pt-11" : "pt-[calc(var(--face)*0.09)]",
          )}
        >
          {label && (
            <span
              style={{ color: binderTextColour(binder.colour) }}
              className="max-h-full rotate-180 truncate font-cosmo text-[length:max(var(--face)*0.068,10px*var(--cover-zoom,1))] leading-none font-black tracking-[0.05em] uppercase opacity-90 [writing-mode:vertical-rl]"
            >
              {binder.name}
            </span>
          )}
        </div>

        <div
          data-cover-face
          className={cn(
            "@container relative aspect-photocard shrink-0 origin-top-left",
            fill ? "w-[min(100%,100cqh*var(--aspect-photocard))]" : "w-full",
          )}
        >
          <Artwork artwork={binder.artwork} fill={fill} />
        </div>
      </div>
    </div>
  );
}

const card =
  "block aspect-photocard w-full rounded-[3cqw] shadow-[0_1.7cqw_4.2cqw_rgb(0_0_0/0.5)]";

/**
 * One objekt on a cover. A cover filling a whole viewer page draws its
 * objekts several times larger than a shelf tile does.
 */
function CoverObjekt({
  image,
  fill,
  className,
}: {
  image: BinderPreviewImage;
  fill: boolean;
  className?: string;
}) {
  return (
    <img
      src={getObjektFrontImageUrl(image, fill ? "thumbnail" : "xs")}
      alt={image.collectionId}
      decoding="async"
      className={cn(card, "bg-white/15 object-cover object-top", className)}
    />
  );
}

/**
 * A lone cover objekt, or a 2×2 collage whose unfilled pockets show as empty
 * sleeves, so an empty binder still reads as a binder. Either sits centred
 * between the spine strip and the edge.
 */
function Artwork({ artwork, fill }: { artwork: BinderArtwork; fill: boolean }) {
  if (artwork.kind === "cover") {
    return (
      <div className="absolute top-1/2 right-[11%] left-[calc(var(--spine)+8cqw)] -translate-y-1/2">
        <CoverObjekt image={artwork.image} fill={fill} className="-rotate-2" />
      </div>
    );
  }

  return (
    <div className="absolute top-1/2 right-[8%] left-[calc(var(--spine)+6cqw)] -translate-y-1/2">
      <div className="grid -rotate-2 grid-cols-2 gap-[3cqw]">
        {Array.from({ length: COLLAGE_SIZE }, (_, i) => {
          const image = artwork.images[i];
          return image === undefined ? (
            <span
              key={`empty-${i}`}
              className={cn(
                card,
                "bg-black/12 shadow-none ring-1 ring-white/12 ring-inset",
              )}
            />
          ) : (
            <CoverObjekt key={image.tokenId} image={image} fill={fill} />
          );
        })}
      </div>
    </div>
  );
}
