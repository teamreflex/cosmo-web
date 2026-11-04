import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ValidSort } from "@apollo/cosmo/types/common";
import type { NonTransferableReason } from "@apollo/cosmo/types/objekts";
import {
  objektFrontImageUrl,
  type ObjektImageName,
  objektImageUrl,
} from "@apollo/image";

export type Hoverable =
  "select" | "lock" | "list" | "binder" | "pin" | NonTransferableReason;

type BackImageSource = Pick<
  Objekt.Collection,
  "slug" | "backImage" | "backImageVersion"
>;

/**
 * Front image URL at the given size, from our CDN once mirrored and from COSMO
 * until then.
 */
export function getObjektFrontImageUrl(
  collection: Pick<
    Objekt.Collection,
    "slug" | "frontImage" | "frontImageVersion"
  >,
  name: ObjektImageName,
) {
  return objektFrontImageUrl(env.VITE_CDN_URL, collection, name);
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
  duplicatesDesc: m.filter_sort_duplicates_desc,
  mintsAsc: m.filter_sort_mints_asc,
  mintsDesc: m.filter_sort_mints_desc,
} satisfies Record<ValidSort, () => string>;

/**
 * Maps a collection sort to its localized, user-facing label.
 */
export function sortLabel(sort: ValidSort): string {
  return sortLabels[sort]();
}
