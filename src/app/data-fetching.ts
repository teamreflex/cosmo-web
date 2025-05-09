import "server-only";
import { cache } from "react";
import { fetchTokenBalances } from "@/lib/server/como";
import * as artists from "@/artists";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { getCookie } from "@/lib/server/cookies";
import { auth, toPublicUser } from "@/lib/server/auth";
import { headers } from "next/headers";
import { experimental_taintObjectReference as taintObjectReference } from "react";
import { fetchFullAccount, toPublicCosmo } from "@/lib/server/cosmo-accounts";
import { notFound } from "next/navigation";
import { FullAccount, PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { db } from "@/lib/server/db";
import { PublicUser } from "@/lib/universal/auth";
import { ObjektList } from "@/lib/server/db/schema";

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
 * Sessions are cookie-cached for 5 minutes.
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

/**
 * Fetch the full account for the given user.
 */
export const getTargetAccount = cache(
  async (username: string): Promise<FullAccount> => {
    const account = await fetchFullAccount(username);
    if (!account) {
      notFound();
    }
    return account;
  }
);

type GetAccount = {
  user: PublicUser;
  cosmo: PublicCosmo | undefined;
  objektLists: ObjektList[];
};

/**
 * Fetch the currently signed in user.
 * For use when needing the user and COSMO account.
 */
export const getCurrentAccount = cache(
  async (userId?: string): Promise<GetAccount | undefined> => {
    // not signed in
    if (!userId) {
      return undefined;
    }

    const result = await db.query.user.findFirst({
      where: { id: userId },
      with: {
        cosmoAccount: true,
        objektLists: true,
      },
    });

    // broken user account
    if (!result) {
      return undefined;
    }

    // no cosmo account, just return the user
    const { cosmoAccount, objektLists, ...user } = result;
    if (!cosmoAccount) {
      return {
        user: toPublicUser(user),
        cosmo: undefined,
        objektLists,
      };
    }

    // return the user and cosmo account
    return {
      cosmo: toPublicCosmo(cosmoAccount),
      user: toPublicUser(user),
      objektLists,
    };
  }
);
