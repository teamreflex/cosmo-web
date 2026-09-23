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
