export type SearchUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
  isAddress: boolean;
};

export type LoginResult = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  accessToken: string;
  refreshToken: string;
};
