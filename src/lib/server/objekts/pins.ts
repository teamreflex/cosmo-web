import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import { indexer } from "../db/indexer";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Collection, Objekt } from "../db/indexer/schema";
import { getTargetAccount } from "@/app/data-fetching";

interface ObjektWithCollection extends Objekt {
  collection: Collection;
}

/**
 * Fetch all pins for the given user.
 */
export async function fetchPins(nickname: string): Promise<CosmoObjekt[]> {
  // should get de-duplicated at this point
  const { pins } = await getTargetAccount(nickname);
  if (pins.length === 0) return [];

  try {
    var results = await indexer.query.objekts.findMany({
      where: {
        id: {
          in: pins,
        },
      },
      with: {
        collection: true,
      },
    });
  } catch (err) {
    return [];
  }

  const mapped = results.map(normalizePin);

  // sort by pin order
  return mapped.sort((a, b) => {
    const indexA = pins.findIndex((item) => item === Number(a.tokenId));
    const indexB = pins.findIndex((item) => item === Number(b.tokenId));
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
