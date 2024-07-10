import { ValidArtist } from "./common";

export type CosmoProfile = {
  artistName: ValidArtist;
  image: {
    original: string;
    thumbnail: string;
  };
};

export type PublicProfile = {
  nickname: string;
  profileImageUrl: string;
  address: string;
  isAddress: boolean;
  artist: ValidArtist;
  privacy: {
    nickname: boolean;
    objekts: boolean;
    como: boolean;
    trades: boolean;
  };
  gridColumns: number;
  isObjektEditor: boolean;
};

export type LoginResult = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  accessToken: string;
  refreshToken: string;
};

export type CosmoUserResult = {
  profile: CosmoUser;
};

export type CosmoUser = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  profileImageUrl: string;
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
    };
    assetBalance: {
      totalComo: number;
      totalObjekt: number;
    };
  }[];
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
