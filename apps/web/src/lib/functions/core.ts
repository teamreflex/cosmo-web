import { auth, toPublicUser } from "@/lib/server/auth.server";
import { remember } from "@/lib/server/cache.server";
import { fetchCookie, putCookie } from "@/lib/server/cookies.server";
import {
  fetchFullAccount,
  toPublicCosmo,
} from "@/lib/server/cosmo-accounts.server";
import { db } from "@/lib/server/db";
import {
  fetchUniqueClasses,
  fetchUniqueCollections,
  fetchUniqueSeasons,
} from "@/lib/server/objekts/filter-data.server";
import type { PublicUser } from "@/lib/universal/auth";
import type { FullAccount, PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { ObjektList } from "@apollo/database/web/types";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import * as z from "zod";

/**
 * Fetch the current session.
 */
export const $fetchCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicUser | null> => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({
      headers: headers,
    });

    if (!session) {
      return null;
    }

    return toPublicUser(session.user);
  },
);

export const FILTER_DATA_CACHE_KEY = "filter-data";

/**
 * Fetch all unique collections, seasons, and classes.
 * Cached for 4 hours.
 */
export const $fetchFilterData = createServerFn({ method: "GET" }).handler(() =>
  remember(FILTER_DATA_CACHE_KEY, 60 * 60 * 4, async () => {
    const [uniqueCollections, seasons, classes] = await Promise.all([
      fetchUniqueCollections(),
      fetchUniqueSeasons(),
      fetchUniqueClasses(),
    ]);

    return {
      collections: uniqueCollections,
      seasons,
      classes,
    };
  }),
);

type GetAccount = {
  user: PublicUser;
  cosmo: PublicCosmo | undefined;
  objektLists: ObjektList[];
};

/**
 * Fetch current user account.
 */
export const $fetchCurrentAccount = createServerFn({ method: "GET" }).handler(
  async (): Promise<GetAccount | null> => {
    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
      returnHeaders: true,
    });

    // not signed in
    if (!session.response) {
      return null;
    }

    // forward Set-Cookie headers to the client
    const cookies = session.headers.getSetCookie();
    if (cookies.length) {
      setResponseHeader("Set-Cookie", cookies);
    }

    const result = await db.query.user.findFirst({
      where: { id: session.response.session.userId },
      with: {
        cosmoAccount: true,
        objektLists: true,
      },
    });

    // broken user account
    if (!result) {
      return null;
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
  },
);

/**
 * Fetch the target account.
 */
export const $fetchTargetAccount = createServerFn({ method: "GET" })
  .inputValidator(z.object({ identifier: z.string() }))
  .handler(async ({ data }): Promise<FullAccount> => {
    const account = await fetchFullAccount(data.identifier);
    if (!account) {
      throw notFound();
    }
    return account;
  });

/**
 * Fetch the selected artists.
 */
export const $fetchSelectedArtists = createServerFn({ method: "GET" }).handler(
  () => {
    return fetchCookie<string[]>("artists") ?? [];
  },
);

/**
 * Set the selected artists in a cookie.
 */
export const $setSelectedArtist = createServerFn({ method: "POST" })
  .inputValidator(z.object({ artist: z.string() }))
  .handler(async ({ data }) => {
    const artists = await $fetchSelectedArtists();

    let selected = [...artists];
    if (artists.includes(data.artist)) {
      selected = artists.filter((a) => a !== data.artist);
    } else {
      selected.push(data.artist);
    }

    putCookie({
      key: "artists",
      value: selected,
    });

    return selected;
  });
