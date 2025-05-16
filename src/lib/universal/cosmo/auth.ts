import { ValidArtist } from "./common";

export type LoginChannel = "email";

export type CosmoProfile = {
  artistName: ValidArtist;
  image: {
    original: string;
    thumbnail: string;
  };
};

export type CosmoUserResult = {
  profile: CosmoUser;
};

export type CosmoUser = {
  id: number;
  guid: string;
  email: string;
  nickname: string;
  address: string;
  birth: string;
  profileImageUrl: string;
  isEligibleForWelcomeObjekt: false;
  followingArtists: {
    name: string;
    title: string;
    fandomName: string;
    logoImageUrl: string;
    purchaseCount: number;
    receivedWelcomeObjekt: boolean;
    contracts: {
      Como: string;
      Objekt: string;
      ObjektMinter: string;
      Governor: string;
      CommunityPool: string;
      ComoMinter: string;
    };
    assetBalance: {
      totalComo: number;
      totalObjekt: number;
    };
    lastViewedArtist: ValidArtist;
    marketingConsentDate: string;
    createdAt: string;
  }[];
  lastViewedArtist: ValidArtist;
  marketingConsentDate: string;
  createdAt: string;
  profile: CosmoProfile[];
};

export type CosmoPublicUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
  profile: CosmoProfile[];
};

export type CosmoSearchResult = {
  results: CosmoPublicUser[];
};

export type CosmoByNicknameResult = {
  profile: {
    nickname: string;
    address: string;
    profileImageUrl: string;
  };
};
