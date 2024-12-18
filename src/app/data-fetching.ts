import { cache } from "react";
import { getUser } from "./api/common";
import { fetchPublicProfile, fetchUserByIdentifier } from "@/lib/server/auth";
import { notFound } from "next/navigation";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { user } from "@/lib/server/cosmo/auth";
import { getCookie } from "@/lib/server/cookies";
import { ValidArtist } from "@/lib/universal/cosmo/common";

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
  const profile = await fetchPublicProfile(profileId);
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
 * Fetch artists with all members from Cosmo.
 */
export const getArtistsWithMembers = cache(async () => {
  return await fetchArtistsWithMembers();
});

/**
 * Fetch the current given user from Cosmo.
 */
export const getCosmoUser = cache(async (accessToken: string) => {
  return await user(accessToken);
});

/**
 * Get the selected artist from cookies.
 */
export const getSelectedArtist = cache(async () => {
  return (await getCookie<ValidArtist>("artist")) ?? "artms";
});
