import { isAddress } from "viem";
import { IdentifiedUser, PublicProfile } from "../universal/cosmo/auth";
import { db } from "./db";
import { CosmoAccount, cosmoAccounts } from "./db/schema";
import { defaultProfile } from "../utils";
import { fetchByNickname } from "./cosmo/auth";
import { FetchError } from "ofetch";

/**
 * Fetch all known addresses from the database.
 */
export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];

  // fetch known profiles
  return await db.query.cosmoAccounts.findMany({
    where: {
      address: {
        in: addresses,
      },
    },
    columns: {
      address: true,
      username: true,
    },
  });
}

/**
 * Fetch a profile by various identifiers.
 */
export async function fetchUserByIdentifier(
  identifier: string
): Promise<IdentifiedUser | undefined> {
  const identifierIsAddress = isAddress(identifier);

  // check db for a profile
  const column = identifierIsAddress ? "address" : "username";
  const profile = await db.query.cosmoAccounts.findFirst({
    where: {
      [column]: decodeURIComponent(identifier),
    },
  });

  if (profile) {
    return {
      profile: {
        ...parseProfile(profile),
        username: profile.username,
        isAddress: identifierIsAddress,
      },
      objektLists: [],
      lockedObjekts: [],
      pins: [],
    };
  }

  // if no profile and it's an address, return it
  if (identifierIsAddress) {
    return {
      profile: {
        ...defaultProfile,
        username: identifier.substring(0, 6),
        address: identifier,
      },
      objektLists: [],
      lockedObjekts: [],
      pins: [],
    };
  }

  // fetch from cosmo while it exists...
  try {
    const profile = await fetchByNickname(identifier);

    // upsert profile
    await db
      .insert(cosmoAccounts)
      .values({
        address: profile.address,
        username: profile.nickname,
      })
      .onConflictDoUpdate({
        target: cosmoAccounts.address,
        set: {
          username: profile.nickname,
        },
      })
      .returning();

    return await fetchUserByIdentifier(profile.nickname);
  } catch (err) {
    if (err instanceof FetchError && err.status !== 404) {
      console.error(`[fetchUserByIdentifier] ${err.status} from COSMO`, err);
    }
    return undefined;
  }
}
/**
 * Convert a database profile to a more friendly type.
 */
function parseProfile(profile: CosmoAccount): PublicProfile {
  return {
    username: profile.username,
    address: profile.address,
    profileImageUrl: "",
    isAddress: false,
  };
}
