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

/**
 * R2 key of a profile picture. The name is random, so the public URL says
 * nothing about whose picture it is.
 */
export function userAvatarKey(id: string) {
  return `user-avatars/${id}.webp`;
}

/**
 * Public URL of a profile picture, from the R2 key stored on its user.
 */
export function userAvatarUrl(cdnUrl: string, avatar: string) {
  return `${cdnUrl}/${avatar}`;
}

/**
 * Side of a stored profile picture in pixels. The largest avatar on the site
 * is 88 CSS px, which this covers at 3x.
 */
export const USER_AVATAR_SIZE = 256;

/**
 * How far the cropper zooms in. A crop is then never narrower than a quarter
 * of the image, which on the smallest front image is still wider than
 * USER_AVATAR_SIZE, so a picture is never upscaled.
 */
export const USER_AVATAR_MAX_ZOOM = 4;

/**
 * A square crop as fractions of the image, `x` and `size` of its width and
 * `y` of its height, so it means the same at every resolution of the image.
 */
export type AvatarCrop = {
  readonly x: number;
  readonly y: number;
  readonly size: number;
};

/**
 * The pixel square a crop covers in an image of the given size. Rounding can
 * put a crop that touches an edge a pixel past it, so the square is held
 * inside the image.
 */
export function avatarCropRect(
  crop: AvatarCrop,
  image: { width: number; height: number },
) {
  const side = Math.max(
    1,
    Math.min(Math.round(crop.size * image.width), image.width, image.height),
  );
  return {
    left: Math.min(
      Math.max(Math.round(crop.x * image.width), 0),
      image.width - side,
    ),
    top: Math.min(
      Math.max(Math.round(crop.y * image.height), 0),
      image.height - side,
    ),
    width: side,
    height: side,
  };
}
