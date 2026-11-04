export type ObjektImageSide = "front" | "back";

/**
 * Target widths of the resized front renditions. `grid` never upscales, so a
 * source narrower than 1200px keeps its own width.
 */
export const OBJEKT_IMAGE_WIDTHS = {
  grid: 1200,
  thumbnail: 600,
  xs: 300,
} as const;

export type ObjektImageSize = keyof typeof OBJEKT_IMAGE_WIDTHS;

/**
 * WebP renditions stored per mirrored image. `original` is the full-size
 * source as WebP; back images only get `original`.
 */
export type ObjektImageName = "original" | ObjektImageSize;

/**
 * A mirrored image: `version` is a hash of the normalised COSMO source URL,
 * so a replaced image lands in a new folder.
 */
export type ObjektImageRef = {
  readonly side: ObjektImageSide;
  readonly slug: string;
  readonly version: string;
};

/**
 * R2 folder holding every file of one mirrored image.
 */
export function objektImagePrefix(ref: ObjektImageRef) {
  return `objekts/${ref.side}/${ref.slug}/${ref.version}`;
}

/**
 * R2 key of a WebP rendition.
 */
export function objektImageKey(ref: ObjektImageRef, name: ObjektImageName) {
  return `${objektImagePrefix(ref)}/${name}.webp`;
}

/**
 * Public URL of a WebP rendition, served by the CDN in front of the bucket.
 */
export function objektImageUrl(
  cdnUrl: string,
  ref: ObjektImageRef,
  name: ObjektImageName,
) {
  return `${cdnUrl}/${objektImageKey(ref, name)}`;
}

/**
 * Replaces the 4x or original suffix from an imagedelivery URL. Other hosts
 * have no variants and pass through unchanged.
 */
function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/4x|original$/i, size);
}

/**
 * Stand-ins for each size before a collection is mirrored: imagedelivery's own
 * variants where it has them, otherwise COSMO's full-size image.
 */
const COSMO_FALLBACKS = {
  xs: (url) => replaceUrlSize(url, "thumbnail"),
  thumbnail: (url) => replaceUrlSize(url),
  grid: (url) => url,
  original: (url) => url,
} satisfies Record<ObjektImageName, (url: string) => string>;

/**
 * Mirror location of a collection's front image, or null until it's mirrored.
 */
export function objektFrontImageRef(collection: {
  slug: string;
  frontImageVersion: string | null;
}): ObjektImageRef | null {
  return collection.frontImageVersion === null
    ? null
    : {
        side: "front",
        slug: collection.slug,
        version: collection.frontImageVersion,
      };
}

/**
 * Front image URL at the given size, from our CDN once mirrored and from COSMO
 * until then.
 */
export function objektFrontImageUrl(
  cdnUrl: string,
  collection: {
    slug: string;
    frontImage: string;
    frontImageVersion: string | null;
  },
  name: ObjektImageName,
) {
  const ref = objektFrontImageRef(collection);
  return ref === null
    ? COSMO_FALLBACKS[name](collection.frontImage)
    : objektImageUrl(cdnUrl, ref, name);
}

/**
 * `srcset` offering resized renditions at their target widths. `grid` is
 * declared at 1200w even when the source was narrower and never upscaled,
 * which only nudges the browser towards it slightly early.
 */
export function objektImageSrcSet(
  cdnUrl: string,
  ref: ObjektImageRef,
  sizes: readonly ObjektImageSize[],
) {
  return sizes
    .map(
      (size) =>
        `${objektImageUrl(cdnUrl, ref, size)} ${OBJEKT_IMAGE_WIDTHS[size]}w`,
    )
    .join(", ");
}
