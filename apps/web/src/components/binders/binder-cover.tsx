import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import {
  type BinderArtwork,
  type BinderPreview,
  type BinderPreviewImage,
  COLLAGE_SIZE,
  binderLayoutLabel,
} from "@/lib/universal/binders";
import { cn } from "@/lib/utils";

type Props = {
  binder: Pick<
    BinderPreview,
    "name" | "colour" | "layout" | "pageCount" | "artwork"
  >;
  /** hide the paper label where the name is already shown beside the cover */
  label?: boolean;
  /** stretch to the container instead of photocard shape, to cover a whole page */
  fill?: boolean;
  className?: string;
};

/**
 * A binder drawn at photocard shape: spine colour, spine shading, sleeve sheen,
 * the cover artwork near the top and a paper label overlapping it from the
 * bottom. Everything inside is sized in container units, so the same cover
 * reads right from a header thumbnail up to a shelf tile.
 */
export default function BinderCover({
  binder,
  label = true,
  fill = false,
  className,
}: Props) {
  return (
    <div className={cn("@container", className)}>
      <div
        style={{ backgroundColor: binder.colour }}
        className={cn(
          "relative overflow-hidden rounded-l-[2.4cqw] rounded-r-photocard border border-white/8 shadow-[inset_6px_0_0_-3px_rgb(0_0_0/0.35),0_14px_30px_-14px_rgb(0_0_0/0.9)] before:absolute before:inset-y-0 before:left-0 before:w-[9cqw] before:bg-linear-to-r before:from-black/45 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(120deg,rgb(255_255_255/0.14),transparent_40%,transparent_70%,rgb(255_255_255/0.05))]",
          fill ? "h-full" : "aspect-photocard",
        )}
      >
        <Artwork artwork={binder.artwork} fill={fill} />

        {label && (
          <span className="absolute right-[7%] bottom-[5%] left-[15%] z-1 block rounded-[2.5cqw] bg-white/93 px-[5cqw] py-[4cqw] font-mono text-[6.4cqw] leading-[1.3] tracking-[0.03em] text-neutral-900 shadow-[0_-4px_14px_rgb(0_0_0/0.3)]">
            <span className="mb-[1.5cqw] line-clamp-3 font-cosmo text-[8.2cqw] leading-[1.1] font-black wrap-break-word uppercase">
              {binder.name}
            </span>
            {m.binder_page_count({ count: binder.pageCount })} ·{" "}
            {binderLayoutLabel(binder.layout)}
          </span>
        )}
      </div>
    </div>
  );
}

const card =
  "block aspect-photocard w-full rounded-[3cqw] shadow-[0_4px_10px_rgb(0_0_0/0.5)]";

/**
 * One objekt on a cover. A cover filling a whole viewer page draws its
 * objekts several times larger than a shelf tile does.
 */
function CoverObjekt({
  image,
  fill,
}: {
  image: BinderPreviewImage;
  fill: boolean;
}) {
  return (
    <img
      src={getObjektFrontImageUrl(image, fill ? "thumbnail" : "xs")}
      alt={image.collectionId}
      decoding="async"
      className={cn(card, "bg-white/15 object-cover object-top")}
    />
  );
}

/**
 * A lone cover objekt, or a 2×2 collage whose unfilled pockets show as empty
 * sleeves, so an empty binder still reads as a binder.
 */
function Artwork({ artwork, fill }: { artwork: BinderArtwork; fill: boolean }) {
  if (artwork.kind === "cover") {
    return (
      <div className="absolute top-[6%] right-[13%] left-[21%] -rotate-2">
        <CoverObjekt image={artwork.image} fill={fill} />
      </div>
    );
  }

  return (
    <div className="absolute top-[7%] right-[9%] left-[18%] grid -rotate-2 grid-cols-2 gap-[3cqw]">
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
  );
}
