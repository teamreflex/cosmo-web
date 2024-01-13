import { ValidArtist } from "./common";

export type CosmoPublicUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
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
};

export type LoginResult = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  accessToken: string;
  refreshToken: string;
};
