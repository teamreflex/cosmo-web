import { cache } from "react";
import { fetchUserByIdentifier } from "@/lib/server/profiles";
import { fetchTokenBalances } from "@/lib/server/como";
import * as artists from "@/artists";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { getCookie } from "@/lib/server/cookies";
import { auth } from "@/lib/server/auth";
import { headers } from "next/headers";
import { experimental_taintObjectReference as taintObjectReference } from "react";
import { fetchUserOrProfile } from "@/lib/server/user";
import { notFound } from "next/navigation";

/**
 * Fetch a user by nickname or address.
 */
export const getUserOrProfile = cache(async (identifier: string) => {
  const user = await fetchUserOrProfile(identifier);
  if (!user) notFound();
  return user;
});

/**
 * Fetch a user by nickname or address.
 * @deprecated Use {@link getUserOrProfile} instead.
 */
export const getUserByIdentifier = cache(async (identifier: string) => {
  const profile = await fetchUserByIdentifier(identifier);
  if (!profile) notFound();
  return profile;
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  taintObjectReference("Don't pass session information to the client", session);

  return session;
});
