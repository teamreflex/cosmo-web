import type { ObjektList } from "@apollo/database/web/types";
import type { PublicUser } from "./auth";

export type PublicCosmo = {
  username: string;
  address: string;
  isAddress: boolean;
} & { __brand: "PublicCosmo" };

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
