import type { ValidArtist } from "./common";

export type CosmoProfile = {
  artistId: ValidArtist;
  artistName: ValidArtist;
  image: {
    original: string;
    thumbnail: string;
  };
};

export type CosmoPublicUser = {
  id: number;
  nickname: string;
  profileImageUrl: string;
  address: string;
  userProfiles: CosmoProfile[];
};

export type CosmoSearchResult = {
  hasNext: boolean;
  nextStartAfter: string | null;
  results: CosmoPublicUser[];
};

export type CosmoUserProfile = {
  id: number;
  nickname: string;
  address: string;
  profileImageUrl: string;
  fandomName: string;
  followDurationDays: number;
  currentStreak: number;
  statusMessage: string | null;
  createdAt: string;
};

export type CosmoByNickname = {
  nickname: string;
  address: string;
  profileImageUrl: string;
  guid: string;
};
