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

/**
 * A user's linked COSMO account, as `getCosmoAddress` reads it.
 */
export type CosmoLink =
  | { kind: "linked"; address: string; username: string }
  | { kind: "none" };

export type FullAccount = {
  status: "active";
  cosmo: PublicCosmo;
  user: PublicUser | undefined;
  lockedObjekts: number[];
  pins: number[];
  verified: boolean;
};

/**
 * A profile whose linked user deleted their account. It carries nothing, so
 * the deleted user's collection, lists and socials can't leak through it.
 */
export type DeletedAccount = { status: "deleted" };

export type TargetAccount = FullAccount | DeletedAccount;

/**
 * The identifier a profile routes under. Address-only profiles carry a
 * truncated address as their display name, so only real accounts can be
 * routed by username.
 */
export function profileIdentifier(cosmo: PublicCosmo) {
  return cosmo.isAddress ? cosmo.address : cosmo.username;
}
