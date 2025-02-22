import { Pin } from "@/lib/server/db/schema";
import { ObjektList } from "../objekts";
import { ValidArtist } from "./common";
import { CollectionDataSource } from "@/lib/utils";

export type LoginChannel = "email";

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
    votes: boolean;
  };
  gridColumns: number;
  isObjektEditor: boolean;
  dataSource: CollectionDataSource;
};

export type IdentifiedUser = {
  profile: PublicProfile;
  objektLists: ObjektList[];
  lockedObjekts: number[];
  pins: Pin[];
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
