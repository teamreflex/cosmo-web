import { cacheArtists } from "@/lib/server/cache/available-artists";
import { fetchHomeNews } from "@/lib/server/cosmo/news";
import { cache } from "react";
import { getUser } from "./api/common";
import { remember } from "@/lib/server/cache/common";
import { fetchObjektLists } from "@/lib/server/objekts/lists";
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
 * Fetch cached Cosmo artists.
 */
export const getArtists = cache(async () => cacheArtists());

/**
 * Fetch the news for the selected artist of the currently logged in user.
 */
export const getNewsForSelectedArtist = cache(
  async (profileId: number, token: string) => {
    const profile = await getProfile(profileId);
    return await remember(
      profile!.artist,
      60 * 15, // 15 minutes
      () => fetchHomeNews(token, profile!.artist)
    );
  }
);

/**
 * Get objekt lists for the given address.
 */
export const getObjektListsForUser = async (address?: string) => {
  return address ? await fetchObjektLists(address) : undefined;
};

/**
 * Fetch a user by nickname or address.
 */
export const getUserByIdentifier = cache(
  async (identifier: string) => await fetchUserByIdentifier(identifier)
);
