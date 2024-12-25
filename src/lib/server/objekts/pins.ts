import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { indexer } from "../db/indexer";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Collection, Objekt } from "../db/indexer/schema";
import { Pin } from "../db/schema";

interface ObjektWithCollection extends Objekt {
  collection: Collection;
}

/**
 * Fetch all pins for the given token ids.
 */
export async function fetchPins(pins: Pin[]): Promise<CosmoObjekt[]> {
  if (pins.length === 0) return [];

  try {
    var results = await indexer.query.objekts.findMany({
      where: (objekts, { inArray }) =>
        inArray(
          objekts.id,
          pins.map((p) => p.tokenId)
        ),
      with: {
        collection: true,
      },
    });
  } catch (err) {
    console.error("Error fetching pins:", err);
    return [];
  }

  const mapped = results.map(normalizePin);

  // sort by pin order
  return mapped.sort((a, b) => {
    const indexA = pins.findIndex((item) => item.tokenId === Number(a.tokenId));
    const indexB = pins.findIndex((item) => item.tokenId === Number(b.tokenId));
    return indexA - indexB;
  });
}

/**
 * Normalize an objekt with collection into an owned objekt.
 */
export function normalizePin(objekt: ObjektWithCollection): CosmoObjekt {
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
