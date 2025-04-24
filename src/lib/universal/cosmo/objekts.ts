import { ValidArtist } from "./common";

export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: number;
  total: number;
  objekts: CosmoObjekt[];
};

export type ObjektBaseFields = {
  collectionId: string;
  season: string;
  member: string;
  collectionNo: string;
  class: string;
  artists: ValidArtist[];
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

interface OwnedObjektCommonFields extends ObjektBaseFields {
  usedForGrid: boolean;
  lenticularPairTokenId: string | null;
  mintedAt: string;
  receivedAt: string;
}

export type NonTransferableReason =
  | "mint-pending"
  | "used-for-grid"
  | "challenge-reward"
  | "welcome-objekt"
  | "effect-objekt"
  | "bookmark-objekt"
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

export type CosmoObjekt = OwnedObjektMinted | OwnedObjektPending;

export type ScannedObjekt = {
  objekt: ObjektBaseFields;
  isClaimed: boolean;
};

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

export type BFFCollectionGroupResponse = {
  collectionCount: number;
  collections: BFFCollectionGroup[];
};

export type BFFCollectionGroup = {
  collection: BFFCollectionGroupCollection;
  count: number;
  objekts: BFFCollectionGroupObjekt[];
};

export type BFFCollectionGroupCollection = {
  collectionId: string;
  season: string;
  collectionNo: string;
  class: string;
  member: string;
  artistMember: {
    id: number;
    name: string;
    alias: string;
    profileImageUrl: string;
    order: number;
  };
  artistName: string;
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  comoAmount: number;
  transferableByDefault: boolean;
  gridableByDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BFFCollectionGroupObjekt = {
  nonTransferableReason?: NonTransferableReason;
  metadata: {
    collectionId: string;
    objektNo: number;
    tokenId: number;
    transferable: boolean;
  };
  inventory: {
    objektId: number;
    owner: string;
    status: "minted" | "pending";
    usedForGrid: boolean;
    mintedAt: string;
    lenticularPairTokenId: number;
    acquiredAt: string;
    updatedAt: string;
  };
};
