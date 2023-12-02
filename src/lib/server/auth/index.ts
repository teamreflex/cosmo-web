import { InferInsertModel, eq } from "drizzle-orm";
import { db } from "../db";
import { profiles } from "../db/schema";
import { PublicUser } from "@/lib/universal/auth";
import { LoginResult } from "@/lib/universal/cosmo/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { search } from "../cosmo/auth";

type InsertProfile = InferInsertModel<typeof profiles>;

/**
 * Find or create a profile for the user.
 */
export async function findOrCreateProfile(payload: LoginResult) {
  // check the db for an existing profile
  const found = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userAddress, payload.address))
    .limit(1);

  // return if it exists
  if (found.length > 0) {
    return found[0];
  }

  // insert if it doesn't
  const newProfile: InsertProfile = {
    userAddress: payload.address,
    cosmoId: payload.id,
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
 * Fetches a profile by id.
 */
export async function fetchProfile(profileId: number) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId));

  if (rows.length === 0) {
    throw new Error("Profile not found");
  }

  return rows[0];
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
 * Fetches a profile by address.
 * Checks database first, then falls back to Cosmo search.
 */
export async function fetchCollectionByNickname(
  nickname: string
): Promise<PublicUser | undefined> {
  // use profile db first
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.nickname, nickname),
    with: {
      lockedObjekts: true,
      lists: true,
    },
  });

  if (profile) {
    return {
      nickname: profile.nickname,
      address: profile.userAddress,
      lockedObjekts: profile.lockedObjekts
        .filter((o) => o.locked)
        .map((o) => o.tokenId),
      lists: profile.lists,
    };
  }

  // fall back to cosmo
  const result = await search(nickname);
  const user = result.find(
    (u) => u.nickname.toLowerCase() === nickname.toLowerCase()
  );

  if (user) {
    return {
      nickname: user.nickname,
      address: user.address,
      lockedObjekts: [],
      lists: [],
    };
  }

  return undefined;
}
