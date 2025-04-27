import type { auth } from "../server/auth";

export type TokenPayload = {
  id: number;
  nickname: string;
  address: string;
  profileId: number;
  accessToken: string;
  refreshToken: string;
};

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
export type PublicUser = Pick<
  User,
  | "id"
  | "username"
  | "image"
  | "isAdmin"
  | "cosmoAddress"
  | "gridColumns"
  | "collectionMode"
>;
