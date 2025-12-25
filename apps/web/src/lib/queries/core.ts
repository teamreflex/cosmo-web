import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { notFound } from "@tanstack/react-router";
import * as z from "zod";
import { $fetchArtists } from "../server/artists";
import type { PublicUser } from "@/lib/universal/auth";
import type { FullAccount, PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { ObjektList } from "@apollo/database/web/types";
import type { CosmoMemberBFF } from "@apollo/cosmo/types/artists";
import {
  fetchUniqueClasses,
  fetchUniqueCollections,
  fetchUniqueSeasons,
} from "@/lib/server/objekts/filter-data";
import { remember } from "@/lib/server/cache";
import { db } from "@/lib/server/db";
import { auth, toPublicUser } from "@/lib/server/auth";
import { fetchFullAccount, toPublicCosmo } from "@/lib/server/cosmo-accounts";
import { fetchCookie } from "@/lib/server/cookies";

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

/**
 * Fetch all unique collections, seasons, and classes.
 * Cached for 4 hours.
 */
export const $fetchFilterData = createServerFn({ method: "GET" }).handler(() =>
  remember("filter-data", 60 * 60 * 4, async () => {
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

/**
 * Fetch the filter data.
 */
export const filterDataQuery = queryOptions({
  queryKey: ["filter-data"],
  queryFn: ({ signal }) => $fetchFilterData({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});

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
 * Fetch the current user account.
 */
export const currentAccountQuery = queryOptions({
  queryKey: ["current-account"],
  queryFn: ({ signal }) => $fetchCurrentAccount({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});

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
 * Fetch the target account.
 */
export const targetAccountQuery = (identifier: string) => {
  const lower = identifier.toLowerCase();
  return queryOptions({
    queryKey: ["target-account", lower],
    queryFn: ({ signal }) =>
      $fetchTargetAccount({ signal, data: { identifier: lower } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Fetch the artists.
 */
export const artistsQuery = queryOptions({
  queryKey: ["artists"],
  queryFn: ({ signal }) => $fetchArtists({ signal }),
  select: (data) => {
    const memberMap: Record<string, CosmoMemberBFF> = {};
    for (const artist of Object.values(data.artists)) {
      for (const member of artist.artistMembers) {
        memberMap[member.name.toLowerCase()] = member;
      }
    }

    return {
      artists: data.artists,
      members: memberMap,
    };
  },
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
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
 * Fetch the selected artists.
 */
export const selectedArtistsQuery = queryOptions({
  queryKey: ["selected-artists"],
  queryFn: () => $fetchSelectedArtists(),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
