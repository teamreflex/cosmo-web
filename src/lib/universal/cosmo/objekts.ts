export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: number;
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
  lenticularPairTokenId: string | null;
  mintedAt: string;
  receivedAt: string;
};

export type NonTransferableReason =
  | "used-for-grid"
  | "challenge-reward"
  | "welcome-objekt"
  | "lenticular-objekt"
  | "not-transferable"; // indexer

interface OwnedObjektMinted extends OwnedObjektCommonFields {
  status: "minted";
  nonTransferableReason?: NonTransferableReason;
}

interface OwnedObjektPending extends OwnedObjektCommonFields {
  status: "pending";
  nonTransferableReason?: "mint-pending";
}

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
