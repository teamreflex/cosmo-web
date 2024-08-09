import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { indexer } from "../db/indexer";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Collection, Objekt } from "../db/indexer/schema";

interface ObjektWithCollection extends Objekt {
  collection: Collection;
}

/**
 * Fetch all pins for the given token ids.
 */
export async function fetchPins(tokenIds: number[]): Promise<OwnedObjekt[]> {
  if (tokenIds.length === 0) return [];

  const results = await indexer.query.objekts.findMany({
    where: (objekts, { inArray }) => inArray(objekts.id, tokenIds),
    with: {
      collection: true,
    },
  });

  return results.map(normalizePin);
}

/**
 * Normalize an objekt with collection into an owned objekt.
 */
export function normalizePin(objekt: ObjektWithCollection): OwnedObjekt {
  return {
    ...objekt.collection,
    status: "minted",
    transferablebyDefault: true,
    tokenAddress: objekt.collection.contract,
    transferable: objekt.transferable,
    usedForGrid: false,
    lenticularPairTokenId: null,
    mintedAt: objekt.mintedAt,
    receivedAt: objekt.receivedAt,
    tokenId: objekt.id.toString(),
    objektNo: objekt.serial,
    artists: [objekt.collection.artist] as ValidArtist[],
  };
}
