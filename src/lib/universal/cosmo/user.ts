import type { LoginChannel } from "./auth";
import type { ValidArtist } from "./common";

export type CosmoShopUser = {
  id: number;
  nickname: string;
  address: string;
  profileImageUrl: string;
  birth: string;
  loginChannel: LoginChannel;
  socialLoginUserId: null;
  isBanned: boolean;
  marketingConsentDate: string;
  lastViewedArtist: string;
  lastActiveAt: string;
  locale: string;
  country: string;
  os: string;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  profileImages: CosmoProfile[];
};

export type CosmoProfile = {
  artistId: ValidArtist;
  artistName: ValidArtist;
  image: {
    original: string;
    thumbnail: string;
  };
};

export type CosmoPublicUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
  userProfiles: CosmoProfile[];
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
