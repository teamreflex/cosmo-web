import type { ObjektList } from "../server/db/schema";
import type { PublicUser } from "./auth";

export type PublicCosmo = {
  username: string;
  address: string;
};

export type PublicAccount = {
  user: PublicUser;
  cosmo: PublicCosmo;
};

export type FullAccount = {
  cosmo: PublicCosmo;
  user: PublicUser | undefined;
  lockedObjekts: number[];
  pins: number[];
  objektLists: ObjektList[];
  verified: boolean;
};
