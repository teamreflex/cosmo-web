import { cache } from "react";
import { getUser } from "./api/common";
import {
  fetchProfile,
  fetchUserByIdentifier,
  parseProfile,
} from "@/lib/server/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { eq } from "drizzle-orm";
import { profiles } from "@/lib/server/db/schema";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";

/**
 * Decode the current token.
 */
export const decodeUser = cache(async () => {
  const auth = await getUser();
  return auth.success ? auth.user : undefined;
});

/**
 * Fetch the user profile.
 */
export const getProfile = cache(async (profileId: number) => {
  const profile = await fetchProfile({
    column: "id",
    identifier: profileId,
  });
  if (!profile) notFound();
  return profile;
});

/**
 * Fetch a user by nickname or address.
 */
export const getUserByIdentifier = cache(async (identifier: string) => {
  const user = await decodeUser();
  return await fetchUserByIdentifier(identifier, user?.accessToken);
});

/**
 * Fetch a user's profile and objekt lists.
 */
export async function getProfileAndLists(profileId: number) {
  const result = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    with: {
      lists: true,
    },
  });

  return {
    profile: result !== undefined ? parseProfile(result) : undefined,
    objektLists: result !== undefined ? result.lists : [],
  };
}

/**
 * Fetch artists with all members from Cosmo.
 */
export const getArtistsWithMembers = cache(async () => {
  return await fetchArtistsWithMembers();
});
