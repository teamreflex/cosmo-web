import type { ValidArtist } from "@apollo/cosmo/types/common";
import type {
  CosmoObjekt,
  NonTransferableReason,
} from "@apollo/cosmo/types/objekts";
import type { Collection, Objekt } from "../../db/indexer/schema";

/**
 * Map indexed objekt/collection into an entity compatible with existing type.
 */
export function mapLegacyObjekt(
  objekt: Objekt,
  collection: Collection,
): CosmoObjekt {
  return {
    ...collection,
    thumbnailImage: collection.frontImage,
    accentColor: collection.textColor,
    artists: [collection.artist as ValidArtist],
    tokenId: String(objekt.id),
    tokenAddress: collection.contract,
    objektNo: objekt.serial,
    mintedAt: objekt.mintedAt,
    receivedAt: objekt.receivedAt,
    status: "minted",
    transferable: objekt.transferable,
    usedForGrid: false,
    nonTransferableReason: nonTransferableReason(
      collection.class,
      objekt.transferable,
    ),
    // cannot currently be determined
    lenticularPairTokenId: null,
    // seemingly unused
    transferablebyDefault: true,
  };
}

/**
 * Derive the non transferable reason from the objekt/collection.
 */
export function nonTransferableReason(
  className: string,
  transferable: boolean,
): NonTransferableReason | undefined {
  if (className === "Welcome") {
    return "welcome-objekt";
  }

  return transferable === false ? "not-transferable" : undefined;
}
