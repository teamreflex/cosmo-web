import { ObjektList } from "./objekts";

export type TokenPayload = {
  id: number;
  nickname: string;
  address: string;
  profileId: number;
  accessToken: string;
  refreshToken: string;
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
