import type { ServerUser } from "../server/auth";
import { CollectionDataSource } from "../utils";

export type TokenPayload = {
  id: number;
  nickname: string;
  address: string;
  profileId: number;
  accessToken: string;
  refreshToken: string;
};

export interface PublicUser
  extends Pick<
    ServerUser,
    | "id"
    | "username"
    | "image"
    | "isAdmin"
    | "cosmoAddress"
    | "gridColumns"
    | "collectionMode"
  > {
  isAdmin: boolean;
  gridColumns: number;
  collectionMode: CollectionDataSource;
}
