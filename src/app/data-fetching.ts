import { cache } from "react";
import { fetchUserByIdentifier } from "@/lib/server/profiles";
import { fetchTokenBalances } from "@/lib/server/como";
import * as artists from "@/artists";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { getCookie } from "@/lib/server/cookies";
import { auth } from "@/lib/server/auth";
import { headers } from "next/headers";

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
export const getArtistsWithMembers = cache(() => {
  return [
    artists.tripleS,
    artists.ARTMS,
    artists.idntt,
  ] satisfies CosmoArtistWithMembersBFF[];
});

/**
 * Fetch the selected artists from the cookie.
 */
export const getSelectedArtists = cache(async () => {
  return (await getCookie<string[]>("artists")) ?? [];
});

/**
 * Fetch the token balances for the given address.
 */
export const getTokenBalances = cache(async (address: string) =>
  fetchTokenBalances(address)
);

/**
 * Fetch the current session.
 */
export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});
