export type TokenPayload = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  profileId: number;
  accessToken: string;
  refreshToken: string;
};

export type PublicUser = {
  nickname: string;
  address: string;
  lockedObjekts: number[];
};
