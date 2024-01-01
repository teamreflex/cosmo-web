export type SearchUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
  isAddress: boolean;
  privacy: {
    nickname: boolean;
    objekts: boolean;
    como: boolean;
    trades: boolean;
  };
};

export type LoginResult = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  accessToken: string;
  refreshToken: string;
};
