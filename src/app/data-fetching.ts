import { cache } from "react";
import { fetchPublicProfile, fetchUserByIdentifier } from "@/lib/server/auth";
import { notFound } from "next/navigation";
import { getCookie } from "@/lib/server/cookies";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { fetchTokenBalances } from "@/lib/server/como";
import * as artists from "@/artists";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";

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
  return await fetchUserByIdentifier(identifier);
});

/**
 * Fetch artists with all members from Cosmo.
 * Cached for 12 hours.
 */
export const getArtistsWithMembers = cache(async () => {
  return [artists.tripleS, artists.ARTMS] satisfies CosmoArtistWithMembersBFF[];

  // return await unstable_cache(
  //   async () => {
  //     const token = await getProxiedToken();
  //     return await Promise.all(
  //       validArtists.map((artist) => fetchArtistBff(artist, token.accessToken))
  //     );
  //   },
  //   ["artists"],
  //   { revalidate: 60 * 60 * 12 }
  // )();
});

/**
 * Get the selected artist from cookies.
 */
export const getSelectedArtist = cache(async () => {
  return (await getCookie<ValidArtist>("artist")) || "artms";
});

/**
 * Fetch the token balances for the given address.
 */
export const getTokenBalances = cache(async (address: string) =>
  fetchTokenBalances(address)
);
