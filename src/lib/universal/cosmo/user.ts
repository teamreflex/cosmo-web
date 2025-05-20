import type { CosmoProfile, LoginChannel } from "./auth";

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
