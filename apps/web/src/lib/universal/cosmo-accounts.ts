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

/**
 * The identifier a profile routes under. Address-only profiles carry a
 * truncated address as their display name, so only real accounts can be
 * routed by username.
 */
export function profileIdentifier(cosmo: PublicCosmo) {
  return cosmo.isAddress ? cosmo.address : cosmo.username;
}
