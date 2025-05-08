import { CollectionDataSource } from "../utils";

export type TokenPayload = {
  id: number;
  nickname: string;
  address: string;
  profileId: number;
  accessToken: string;
  refreshToken: string;
};

export type PublicUser = {
  id: string;
  username: string | undefined;
  image: string | undefined;
  isAdmin: boolean;
  gridColumns: number;
  collectionMode: CollectionDataSource;
};
