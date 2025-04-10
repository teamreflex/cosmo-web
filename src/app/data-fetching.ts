import { cache } from "react";
import { getUser } from "./api/common";
import { fetchPublicProfile, fetchUserByIdentifier } from "@/lib/server/auth";
import { notFound } from "next/navigation";
import { search, user } from "@/lib/server/cosmo/auth";
import { getCookie } from "@/lib/server/cookies";
import { ValidArtist, validArtists } from "@/lib/universal/cosmo/common";
import { fetchArtistBff } from "@/lib/server/cosmo/artists";
import { unstable_cache } from "next/cache";
import { fetchSeasons } from "@/lib/server/cosmo/season";
import { getProxiedToken } from "@/lib/server/handlers/withProxiedToken";

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
 * Cached for 12 hours.
 */
export const getArtistsWithMembers = cache(async () => {
  return await unstable_cache(
    async () => {
      const token = await getProxiedToken();
      return await Promise.all(
        validArtists.map((artist) => fetchArtistBff(artist, token.accessToken))
      );
    },
    ["artists"],
    { revalidate: 60 * 60 * 12 }
  )();
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
  return (await getCookie<ValidArtist>("artist")) || "artms";
});

/**
 * Find a user's avatars via COSMO search and cache for 24 hours.
 */
export const getUserAvatar = cache(async (token: string, nickname: string) => {
  return await unstable_cache(
    async (nickname: string) => {
      const { results } = await search(token, nickname);
      return results.find(
        (u) => u.nickname.toLowerCase() === nickname.toLowerCase()
      );
    },
    ["user-avatar"],
    { revalidate: 60 * 60 * 24 }
  )(nickname);
});

/**
 * Fetch the seasons for the given artist and cache for 24 hours.
 */
export const getSeasons = cache(async (token: string, artist: ValidArtist) => {
  return await unstable_cache(
    async (artist: ValidArtist) => fetchSeasons(token, artist),
    ["cosmo-seasons"],
    { revalidate: 60 * 60 * 24 }
  )(artist);
});
