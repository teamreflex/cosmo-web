import { COSMO_ENDPOINT } from "./common";

export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: string;
  total: number;
  objekts: OwnedObjekt[];
};

type OwnedObjektCommonFields = {
  collectionId: string;
  season: string;
  member: string;
  collectionNo: string;
  class: string;
  artists: ("artms" | "tripleS")[];
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  comoAmount: number;
  transferablebyDefault: boolean;
  tokenId: string;
  tokenAddress: string;
  objektNo: number;
  transferable: boolean;
  usedForGrid: boolean;
  mintedAt: string;
  receivedAt: string;
};

type OwnedObjektMinted = OwnedObjektCommonFields & {
  status: "minted";
};

type OwnedObjektPending = OwnedObjektCommonFields & {
  status: "pending";
  nonTransferableReason?: "mint-pending";
};

export type OwnedObjekt = OwnedObjektMinted | OwnedObjektPending;

export type GasStationResult = {
  safeLow: {
    maxFee: number;
    maxPriorityFee: number;
  };
  standard: {
    maxFee: number;
    maxPriorityFee: number;
  };
  fast: {
    maxFee: number;
    maxPriorityFee: number;
  };
  estimatedBaseFee: number;
  blockTime: number;
  blockNumber: number;
};

export type ObjektMetadata = {
  name: string;
  description: string;
  image: string;
  background_color: string;
  attributes: Record<string, string>[];
  objekt: {
    collectionId: string;
    season: string;
    member: string;
    collectionNo: string;
    class: string;
    artists: ("artms" | "tripleS")[];
    thumbnailImage: string;
    frontImage: string;
    backImage: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    comoAmount: number;
    transferablebyDefault: boolean;
    tokenId: string;
    tokenAddress: string;
    objektNo: number;
    transferable: boolean;
  };
};

/**
 * Fetch token metadata from Cosmo.
 * @param tokenId string
 */
export async function fetchObjekt(tokenId: string) {
  const res = await fetch(`${COSMO_ENDPOINT}/objekt/v1/token/${tokenId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch token "${tokenId}"`);
  }

  const result: ObjektMetadata = await res.json();
  return result;
}
