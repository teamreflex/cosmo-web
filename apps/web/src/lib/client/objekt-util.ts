import { m } from "@/i18n/messages";
import type { NonTransferableReason } from "@apollo/cosmo/types/objekts";

export type Hoverable =
  | "send"
  | "lock"
  | "locked"
  | "list"
  | "pin"
  | "pinned"
  | NonTransferableReason;

/**
 * Replaces the 4x or original suffix from an image URL.
 */
function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/4x|original$/i, size);
}

/**
 * Replaces the 4x suffix from both image URLs.
 */
export function getObjektImageUrls(opts: {
  frontImage: string;
  backImage: string;
}) {
  const front = replaceUrlSize(opts.frontImage);
  const back = replaceUrlSize(opts.backImage);

  return {
    front: {
      display: front,
      download: opts.frontImage,
    },
    back: {
      display: back,
      download: opts.backImage,
    },
  };
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
