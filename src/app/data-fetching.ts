import { cacheArtists } from "@/lib/server/cache";
import { fetchHomeNews } from "@/lib/server/cosmo";
import { cache } from "react";
import { getUser } from "./api/common";
import { remember } from "@/lib/server/cache/common";
import { fetchObjektLists } from "@/lib/server/objekts";
import { fetchProfile } from "@/lib/server/auth";

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
export const getProfile = cache(
  async (profileId: number) => await fetchProfile(profileId)
);

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
      profile.artist,
      60 * 15, // 15 minutes
      () => fetchHomeNews(token, profile.artist)
    );
  }
);

/**
 * Get objekt lists for the given address.
 */
export const getObjektListsForUser = async (address?: string) => {
  return address ? await fetchObjektLists(address) : undefined;
};
