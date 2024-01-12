import { InferInsertModel, desc, eq, or } from "drizzle-orm";
import { db } from "../db";
import { profiles } from "../db/schema";
import { FetchProfile } from "@/lib/universal/auth";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { fetchByNickname } from "../cosmo/auth";
import { isAddress } from "ethers/lib/utils";
import { notFound } from "next/navigation";

type InsertProfile = InferInsertModel<typeof profiles>;

type FindOrCreateProfile = {
  userAddress: string;
  nickname: string;
  cosmoId: number;
};

/**
 * Create a new profile.
 */
async function createProfile(payload: FindOrCreateProfile) {
  const newProfile: InsertProfile = {
    userAddress: payload.userAddress,
    cosmoId: payload.cosmoId,
    nickname: payload.nickname,
    artist: "artms",
  };
  const insertResult = await db.insert(profiles).values(newProfile);

  // have to refetch because mysql has no RETURNING clause
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, parseInt(insertResult.insertId)));

  if (rows.length === 0) {
    throw new Error("Failed to create profile");
  }
  return rows[0];
}

/**
 * Update a profile.
 */
export async function updateProfile(id: number, payload: FindOrCreateProfile) {
  const result = await db
    .update(profiles)
    .set({
      cosmoId: payload.cosmoId,
    })
    .where(eq(profiles.id, id));

  return result.rowsAffected === 1;
}

/**
 * Find or create a profile for the user.
 */
export async function findOrCreateProfile(payload: FindOrCreateProfile) {
  // check the db for an existing profile
  const found = await db
    .select()
    .from(profiles)
    .where(
      or(
        eq(profiles.userAddress, payload.userAddress),
        eq(profiles.nickname, payload.nickname)
      )
    )
    .limit(1);

  // return if it exists
  if (found.length > 0) {
    return found[0];
  }

  // insert if it doesn't
  return await createProfile(payload);
}

/**
 * Update the selected artist for a profile.
 */
export async function setSelectedArtist(
  profileId: number,
  artist: ValidArtist
) {
  const result = await db
    .update(profiles)
    .set({ artist })
    .where(eq(profiles.id, profileId));

  return result.rowsAffected === 1;
}

/**
 * Fetch a profile by various identifiers.
 */
export async function fetchUserByIdentifier(
  identifier: string
): Promise<PublicProfile> {
  const identifierIsAddress = isAddress(identifier);

  // check db for a profile
  const profile = await fetchProfileByIdentifier(identifier);

  const shouldHide = profile?.privacyNickname === true && identifierIsAddress;

  if (profile) {
    return {
      nickname: shouldHide
        ? profile.userAddress.substring(0, 6)
        : profile.nickname,
      address: profile.userAddress,
      profileImageUrl: "",
      isAddress: shouldHide,
      privacy: {
        nickname: profile.privacyNickname,
        objekts: profile.privacyObjekts,
        como: profile.privacyComo,
        trades: profile.privacyTrades,
      },
    };
  }

  // if no profile and it's an address, return it
  if (identifierIsAddress) {
    return {
      nickname: identifier.substring(0, 6),
      address: identifier,
      profileImageUrl: "",
      isAddress: true,
      privacy: {
        nickname: false,
        objekts: false,
        como: false,
        trades: false,
      },
    };
  }

  // fall back to cosmo
  const user = await fetchByNickname(identifier);
  if (!user) {
    notFound();
  }

  // insert a new profile for caching
  await createProfile({
    userAddress: user.address,
    nickname: user.nickname,
    cosmoId: 0,
  });

  return {
    nickname: user.nickname,
    address: user.address,
    profileImageUrl: user.profileImageUrl,
    isAddress: false,
    privacy: {
      nickname: false,
      objekts: false,
      como: false,
      trades: false,
    },
  };
}

/**
 * Fetch a profile by a nickname, address or ID.
 */
export async function fetchProfile(payload: FetchProfile) {
  const rows = await db
    .select()
    .from(profiles)
    .where(
      payload.column === "id"
        ? eq(profiles.id, payload.identifier)
        : eq(
            payload.column === "nickname"
              ? profiles.nickname
              : profiles.userAddress,
            payload.identifier
          )
    );

  if (rows.length === 0) {
    return undefined;
  }

  return rows[0];
}

/**
 * Fetch a profile by a nickname or address.
 */
async function fetchProfileByIdentifier(identifier: string) {
  const rows = await db
    .select()
    .from(profiles)
    .where(
      or(
        eq(profiles.nickname, identifier),
        eq(profiles.userAddress, identifier)
      )
    )
    // fetch the latest profile instead of the first logged
    .orderBy(desc(profiles.id))
    .limit(1);

  if (rows.length === 0) {
    return undefined;
  }

  return rows[0];
}

/**
 * Fetch all known profiles for the given address.
 */
export async function fetchProfilesForAddress(address: string) {
  return await db
    .select()
    .from(profiles)
    .where(eq(profiles.userAddress, address));
}
