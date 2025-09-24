import { cache } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { notFound } from "@tanstack/react-router";
import type { FullAccount, PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { PublicUser } from "@/lib/universal/auth";
import type { ObjektList } from "@/lib/server/db/schema";
import { fetchTokenBalances } from "@/lib/server/como";
import { fetchCookie } from "@/lib/server/cookies";
import { auth, toPublicUser } from "@/lib/server/auth";
import { fetchFullAccount, toPublicCosmo } from "@/lib/server/cosmo-accounts";
import { db } from "@/lib/server/db";

/**
 * Fetch the selected artists from the cookie.
 */
export const getSelectedArtists = cache(() => {
  return fetchCookie<string[]>("artists") ?? [];
});

/**
 * Fetch the token balances for the given address.
 */
export const getTokenBalances = cache((address: string) =>
  fetchTokenBalances(address)
);

/**
 * Fetch the current session.
 */
export const getSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({
    headers: headers,
  });

  if (!session) {
    return null;
  }

  return session;
});

/**
 * Fetch the full account for the given user.
 */
export const getTargetAccount = cache(
  async (username: string): Promise<FullAccount> => {
    const account = await fetchFullAccount(username);
    if (!account) {
      throw notFound();
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
