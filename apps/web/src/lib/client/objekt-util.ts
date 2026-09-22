import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ValidSort } from "@apollo/cosmo/types/common";
import type { NonTransferableReason } from "@apollo/cosmo/types/objekts";
import {
  type ObjektImageName,
  type ObjektImageRef,
  objektImageUrl,
} from "@apollo/image";

export type Hoverable =
  | "select"
  | "lock"
  | "list"
  | "pin"
  | NonTransferableReason;

/**
 * Replaces the 4x or original suffix from an imagedelivery URL. Other hosts
 * have no variants and pass through unchanged.
 */
function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/4x|original$/i, size);
}

type FrontImageSource = Pick<
  Objekt.Collection,
  "slug" | "frontImage" | "frontImageVersion"
>;

type BackImageSource = Pick<
  Objekt.Collection,
  "slug" | "backImage" | "backImageVersion"
>;

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
export function getObjektFrontImageRef(
  collection: FrontImageSource,
): ObjektImageRef | null {
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
export function getObjektFrontImageUrl(
  collection: FrontImageSource,
  name: ObjektImageName,
) {
  const ref = getObjektFrontImageRef(collection);
  return ref === null
    ? COSMO_FALLBACKS[name](collection.frontImage)
    : objektImageUrl(env.VITE_CDN_URL, ref, name);
}

/**
 * Full-size back image URL, from our CDN once mirrored and from COSMO until
 * then. Back images are only mirrored at full size.
 */
export function getObjektBackImageUrl(collection: BackImageSource) {
  return collection.backImageVersion === null
    ? collection.backImage
    : objektImageUrl(
        env.VITE_CDN_URL,
        {
          side: "back",
          slug: collection.slug,
          version: collection.backImageVersion,
        },
        "original",
      );
}

/**
 * Returns the edition of the collection based on the collection number.
 */
export function getEdition(collectionNo: string): string | null {
  const collection = parseInt(collectionNo);

  if ((collection >= 101 && collection <= 108) || collection === 501) {
    return m.objekt_edition_1st();
  }
  if ((collection >= 109 && collection <= 116) || collection === 502) {
    return m.objekt_edition_2nd();
  }
  if ((collection >= 117 && collection <= 120) || collection === 503) {
    return m.objekt_edition_3rd();
  }
  return null;
}

export class ObjektNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjektNotFoundError";
  }
}

/**
 * Maps a NonTransferableReason to a localized, user-facing label.
 */
export function reasonLabel(reason: NonTransferableReason): string {
  switch (reason) {
    case "mint-pending":
      return m.objekt_overlay_mint_pending();
    case "welcome-objekt":
      return m.objekt_overlay_welcome_reward();
    case "used-for-grid":
      return m.objekt_overlay_used_for_grid();
    case "challenge-reward":
      return m.objekt_overlay_event_reward();
    case "not-transferable":
    default:
      return m.objekt_overlay_not_transferable();
  }
}

const sortLabels = {
  newest: m.filter_sort_newest,
  oldest: m.filter_sort_oldest,
  noAscending: m.filter_sort_no_ascending,
  noDescending: m.filter_sort_no_descending,
  serialAsc: m.filter_sort_serial_asc,
  serialDesc: m.filter_sort_serial_desc,
  memberAsc: m.filter_sort_member_asc,
  memberDesc: m.filter_sort_member_desc,
} satisfies Record<ValidSort, () => string>;

/**
 * Maps a collection sort to its localized, user-facing label.
 */
export function sortLabel(sort: ValidSort): string {
  return sortLabels[sort]();
}
