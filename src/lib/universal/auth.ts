import { ObjektList } from "./objekts";

export type TokenPayload = {
  id: number;
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
  lists: ObjektList[];
  isAddress: boolean;
};

export type FetchProfile =
  | {
      identifier: string;
      column: "nickname" | "address";
    }
  | {
      identifier: number;
      column: "id";
    };
