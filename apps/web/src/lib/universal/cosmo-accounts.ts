import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import type { PublicUser } from "./auth";

export type PublicCosmo = {
  username: string;
  address: string;
  isAddress: boolean;
} & { __brand: "PublicCosmo" };

/**
 * A user's linked COSMO account, as `getCosmoAddress` reads it.
 */
export type CosmoLink =
  { kind: "linked"; address: string; username: string } | { kind: "none" };

export type FullAccount = {
  cosmo: PublicCosmo;
  user: PublicUser | undefined;
  lockedObjekts: number[];
  pins: number[];
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

/**
 * A COSMO user search result. `avatar` is the R2 key of the profile picture
 * of the Apollo user who linked the account, null without a link or a
 * picture. The search dialog shows it rather than COSMO's own profile images,
 * so a result matches the profile it opens.
 */
export type SearchedCosmoUser = CosmoPublicUser & { avatar: string | null };
