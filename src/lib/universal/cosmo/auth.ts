export type SearchUser = {
  nickname: string;
  profileImageUrl: string;
  address: string;
};

export type LoginResult = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  accessToken: string;
  refreshToken: string;
};
