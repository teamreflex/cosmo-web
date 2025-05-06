import { isAddress } from "viem";
import { IdentifiedUser, PublicProfile } from "../universal/cosmo/auth";
import { db } from "./db";
import { Profile, profiles } from "./db/schema";
import { defaultProfile } from "../utils";
import { fetchByNickname } from "./cosmo/auth";
import { FetchError } from "ofetch";

/**
 * Fetch all known addresses from the database.
 */
export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];

  // fetch known profiles
  return await db.query.profiles.findMany({
    where: {
      userAddress: {
        in: addresses,
      },
    },
    columns: {
      userAddress: true,
      nickname: true,
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
  const column = identifierIsAddress ? "userAddress" : "nickname";
  const profile = await db.query.profiles.findFirst({
    where: {
      [column]: decodeURIComponent(identifier),
    },
  });

  if (profile) {
    return {
      profile: {
        ...parseProfile(profile),
        nickname: profile.nickname,
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
        nickname: identifier.substring(0, 6),
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
      .insert(profiles)
      .values({
        userAddress: profile.address,
        nickname: profile.nickname,
        cosmoId: 0,
        artist: "artms",
      })
      .onConflictDoUpdate({
        target: profiles.userAddress,
        set: {
          nickname: profile.nickname,
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
function parseProfile(profile: Profile): PublicProfile {
  return {
    nickname: profile.nickname,
    address: profile.userAddress,
    profileImageUrl: "",
    isAddress: false,
    artist: profile.artist,
    privacy: {
      votes: profile.privacyVotes,
    },
    gridColumns: profile.gridColumns,
    isObjektEditor: profile.objektEditor,
    dataSource: profile.dataSource ?? "blockchain",
    isModhaus: profile.isModhaus,
  };
}
