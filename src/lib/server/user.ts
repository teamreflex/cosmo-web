import "server-only";
import { fetchUserByIdentifier } from "./profiles";
import { db } from "./db";
import { toPublicUser } from "./auth";
import { PublicProfile } from "../universal/cosmo/auth";
import { PublicUser } from "../universal/auth";
import { isAddress } from "viem";

/**
 * Fetches both a user and a COSMO profile in parallel.
 * User is prioritized, then falls back to COSMO profile.
 */
export async function fetchUserOrProfile(
  identifier: string
): Promise<PublicUser | undefined> {
  const [profile, user] = await Promise.all([
    fetchUserByIdentifier(identifier),
    fetchUser(identifier),
  ]);

  // if the usernames match and the user has no address, map the address from the profile
  const mapAddress =
    user &&
    user.cosmoAddress === undefined &&
    profile?.profile.address !== undefined;
  if (mapAddress) {
    return {
      ...user,
      cosmoAddress: profile.profile.address,
      fromCosmo: true,
    };
  }

  return user ?? (profile ? profileToPublicUser(profile.profile) : undefined);
}

/**
 * Fetch a user by username or COSMO address.
 */
async function fetchUser(identifier: string): Promise<PublicUser | undefined> {
  const column = isAddress(identifier) ? "cosmoAddress" : "displayUsername";
  const user = await db.query.user.findFirst({
    where: {
      [column]: identifier,
    },
  });

  return user ? toPublicUser(user) : undefined;
}

/**
 * Convert a COSMO profile to a public user.
 */
function profileToPublicUser(profile: PublicProfile): PublicUser {
  return {
    id: crypto.randomUUID(),
    username: profile.nickname,
    image: undefined,
    isAdmin: profile.isObjektEditor,
    cosmoAddress: profile.address,
    gridColumns: profile.gridColumns,
    collectionMode: profile.dataSource,
    href: profile.isAddress ? profile.address : profile.nickname,
    fromCosmo: true,
  };
}
