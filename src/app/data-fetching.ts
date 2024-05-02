import { cache } from "react";
import { getUser } from "./api/common";
import { fetchProfile, fetchUserByIdentifier } from "@/lib/server/auth";
import { notFound } from "next/navigation";

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
