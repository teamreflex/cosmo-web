import { db } from "./db";
import { Profile, profiles } from "./db/schema";
import { IdentifiedUser, PublicProfile } from "@/lib/universal/cosmo/auth";
import { isAddress } from "viem";
import { notFound } from "next/navigation";
import { defaultProfile } from "@/lib/utils";
import { fetchByNickname } from "./cosmo/auth";
import { FetchError } from "ofetch";

/**
 * Fetch a profile by various identifiers.
 */
export async function fetchUserByIdentifier(
  identifier: string
): Promise<IdentifiedUser> {
  const identifierIsAddress = isAddress(identifier);

  // check db for a profile
  const profile = await fetchProfileByIdentifier(
    identifier,
    identifierIsAddress ? "userAddress" : "nickname"
  );

  if (profile) {
    return {
      profile: {
        ...parseProfile(profile),
        nickname: profile.nickname,
        isAddress: identifierIsAddress,
      },
      objektLists: profile.lists,
      lockedObjekts: profile.lockedObjekts.map((row) => row.tokenId),
      pins: profile.pins,
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
    notFound();
  }
}

/**
 * Fetch a profile by ID and parse it.
 */
export async function fetchPublicProfile(id: number) {
  const result = await db.query.profiles.findFirst({
    where: { id },
  });

  return result !== undefined ? parseProfile(result) : undefined;
}

/**
 * Fetch a profile by a nickname or address.
 */
async function fetchProfileByIdentifier(
  identifier: string,
  column: "nickname" | "userAddress"
) {
  return db.query.profiles.findFirst({
    where: {
      [column]: decodeURIComponent(identifier),
    },
    with: {
      lists: true,
      lockedObjekts: {
        where: {
          locked: true,
        },
        columns: {
          tokenId: true,
        },
      },
      pins: {
        orderBy: {
          id: "desc",
        },
      },
    },
  });
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
