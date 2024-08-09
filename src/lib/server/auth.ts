import { eq } from "drizzle-orm";
import { db } from "./db";
import { Profile, profiles } from "./db/schema";
import { FetchProfile } from "@/lib/universal/auth";
import { IdentifiedUser, PublicProfile } from "@/lib/universal/cosmo/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { fetchByNickname } from "./cosmo/auth";
import { isAddress } from "ethers/lib/utils";
import { notFound, redirect } from "next/navigation";
import { defaultProfile } from "@/lib/utils";

type InsertProfile = typeof profiles.$inferInsert;
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
  const rows = await db.insert(profiles).values(newProfile).returning();

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
    .where(eq(profiles.id, id))
    .returning();

  return result.length === 1;
}

/**
 * Find or create a profile for the user.
 */
export async function findOrCreateProfile(payload: FindOrCreateProfile) {
  // check the db for an existing profile
  const result = await db.query.profiles.findFirst({
    where: (profiles, { or, eq }) =>
      or(
        eq(profiles.userAddress, payload.userAddress),
        eq(profiles.nickname, payload.nickname)
      ),
    orderBy: (profiles, { desc }) => desc(profiles.id),
  });

  // insert if it doesn't exist
  if (result === undefined) {
    return await createProfile(payload);
  }

  // return if it does
  return result;
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
    .where(eq(profiles.id, profileId))
    .returning();

  return result.length === 1;
}

/**
 * Fetch a profile by various identifiers.
 */
export async function fetchUserByIdentifier(
  identifier: string,
  token?: string
): Promise<IdentifiedUser> {
  const identifierIsAddress = isAddress(identifier);

  // check db for a profile
  const profile = await fetchProfileByIdentifier(identifier);

  const shouldHide = profile?.privacyNickname === true && identifierIsAddress;

  if (profile) {
    return {
      profile: {
        ...parseProfile(profile),
        nickname: shouldHide
          ? profile.userAddress.substring(0, 6)
          : profile.nickname,
        isAddress: shouldHide,
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

  // if the user is a guest, redirect to login due to cosmo auth block
  if (!token) {
    redirect("/auth");
  }

  // fall back to cosmo
  const user = await fetchByNickname(token, identifier);
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
    profile: {
      ...defaultProfile,
      nickname: user.nickname,
      address: user.address,
      profileImageUrl: user.profileImageUrl,
    },
    objektLists: [],
    lockedObjekts: [],
    pins: [],
  };
}

/**
 * Fetch a profile by a nickname, address or ID.
 */
export async function fetchProfile(payload: FetchProfile) {
  const result = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => {
      return payload.column === "id"
        ? eq(profiles.id, payload.identifier)
        : eq(
            payload.column === "nickname"
              ? profiles.nickname
              : profiles.userAddress,
            payload.identifier
          );
    },
    orderBy: (profiles, { desc }) => desc(profiles.id),
  });

  return result !== undefined ? parseProfile(result) : undefined;
}

/**
 * Fetch a profile by a nickname or address.
 */
async function fetchProfileByIdentifier(identifier: string) {
  return db.query.profiles.findFirst({
    where: (profiles, { or, eq }) =>
      or(
        eq(profiles.nickname, identifier),
        eq(profiles.userAddress, identifier)
      ),
    orderBy: (profiles, { desc }) => desc(profiles.id),
    with: {
      lists: true,
      lockedObjekts: {
        where: (lockedObjekts, { eq }) => eq(lockedObjekts.locked, true),
        columns: {
          tokenId: true,
        },
      },
      pins: true,
    },
  });
}

/**
 * Fetch all known profiles for the given address.
 */
export async function fetchProfilesForAddress(address: string) {
  return await db.query.profiles.findMany({
    where: (profiles, { eq }) => eq(profiles.userAddress, address),
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
      nickname: profile.privacyNickname,
      objekts: profile.privacyObjekts,
      como: profile.privacyComo,
      trades: profile.privacyTrades,
    },
    gridColumns: profile.gridColumns,
    isObjektEditor: profile.objektEditor,
  };
}
