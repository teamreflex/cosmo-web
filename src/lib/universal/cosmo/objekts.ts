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
  mintedAt: string;
  receivedAt: string;
};

type OwnedObjektMinted = OwnedObjektCommonFields & {
  status: "minted";
  nonTransferableReason?:
    | "used-for-grid"
    | "challenge-reward"
    | "welcome-objekt";
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
