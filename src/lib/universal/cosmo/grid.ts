import type { ValidArtist } from "./common";

export type CosmoGridEdition = {
  id: string;
  artist: ValidArtist;
  title: string;
  subtitle: string;
  image: string;
  order: number;
  createdAt: string;
  status: {
    totalGrids: number;
    completedGrids: number;
  };
  season: {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    activeAt: string;
    order: number;
    id: number;
    artist: ValidArtist;
    title: string;
    image: string | null;
    startDate: string;
    endDate: string;
    ongoing: boolean;
  };
};

type CosmoGridSlot = {
  no: number;
  collections: string[];
};

type CosmoGridReward = {
  collectionId: string;
};

export type CosmoGrid = {
  id: string;
  member: string;
  memberImage: string;
  class: "First";
  edition: {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    activeAt: string;
    order: number;
    id: string;
    artist: ValidArtist;
    title: string;
    subtitle: string;
    image: string;
    season: {
      createdAt: string;
      createdBy: string;
      updatedAt: string;
      activeAt: string;
      order: number;
      id: number;
      artist: ValidArtist;
      title: string;
      image: string | null;
      startDate: string;
      endDate: string | null;
    };
  };
  slots: CosmoGridSlot[];
  reward: CosmoGridReward[];
};

type CosmoOngoingGridSlotWithoutPreferred = {
  no: number;
  completed: false;
  preferredObjekt: undefined;
};

type CosmoGridSlotObjekt = {
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
  transferableByDefault: boolean;
  tokenId: string;
  tokenAddress: string;
  objektNo: number;
  transferable: boolean;
};

type CosmoOngoingGridSlotWithPreferred = {
  no: number;
  completed: false;
  preferredObjekt: CosmoGridSlotObjekt;
};

export type CosmoOngoingGridSlot =
  | CosmoOngoingGridSlotWithoutPreferred
  | CosmoOngoingGridSlotWithPreferred;

export type CosmoOngoingGrid = {
  ongoing: {
    id: number;
    slotStatuses: CosmoOngoingGridSlot[];
    allCompleted: boolean;
    rewardClaimed: boolean;
  };
  ownedRewardObjektCount: number;
};

export type CosmoGridSlotCompletion = {
  no: number;
  tokenIdToUse: string;
};

export type CosmoGridRewardClaimResult = {
  objekt: {
    collectionId: string;
    season: string;
    member: string;
    collectionNo: string;
    class: "Special";
    artists: ValidArtist[];
    thumbnailImage: string;
    frontImage: string;
    backImage: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    comoAmount: number;
    transferableByDefault: boolean;
    tokenId: string;
    tokenAddress: string;
    objektNo: number;
    transferable: boolean;
  };
  transaction: {
    txId: string;
    chainId: string;
    ref: string;
  };
};
