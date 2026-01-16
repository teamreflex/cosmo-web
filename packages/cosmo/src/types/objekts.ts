import type { ValidArtist } from "./common";

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
  bandImageUrl: string | null;
  frontMedia: string | null;
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
  bandImageUrl: string | null;
  frontMedia: string | null;
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

export type ObjektSummariesResponse = {
  collectionCount: number;
  collections: ObjektSummary[];
};

export type ObjektSummary = {
  collection: {
    collectionId: string;
    artistName: string;
    frontMedia?: string | null;
    bandImageUrl?: string | null;
  };
};
