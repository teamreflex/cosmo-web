import { infiniteQueryOptions } from "@tanstack/react-query";
import { getTypesenseResults } from "../client/typesense";
import { fetchObjektsIndex } from "../server/objekts/prefetching/objekt-index";
import {
  PER_PAGE as BLOCKCHAIN_GROUPS_PER_PAGE,
  fetchObjektsBlockchainGroups,
} from "../server/objekts/prefetching/objekt-blockchain-groups";
import { fetchObjektsBlockchain } from "../server/objekts/prefetching/objekt-blockchain";
import { fetchObjektListEntries } from "../server/objekts/prefetching/objekt-list";
import type z from "zod";
import type {
  objektIndexFrontendSchema,
  objektListFrontendSchema,
  userCollectionFrontendSchema,
} from "./parsers";

/**
 * Object index: Searching via Typesense
 */
export function objektIndexTypesenseQuery(
  searchParams: z.infer<typeof objektIndexFrontendSchema>,
  selectedArtists: string[]
) {
  return infiniteQueryOptions({
    queryKey: [
      "objekt-index",
      "typesense",
      {
        ...searchParams,
        id: null, // should never trigger a refetch
        search: searchParams.search || null,
        artists: selectedArtists,
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return await getTypesenseResults({
        query: searchParams.search || "",
        filters: {
          ...searchParams,
          artist: searchParams.artist,
          member: searchParams.member,
        },
        page: pageParam,
        artists: selectedArtists,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
  });
}

/**
 * Object index: Listing via blockchain
 */
export function objektIndexBlockchainQuery(
  searchParams: z.infer<typeof objektIndexFrontendSchema>,
  selectedArtists: string[]
) {
  return infiniteQueryOptions({
    queryKey: [
      "objekt-index",
      "blockchain",
      {
        ...searchParams,
        id: null, // should never trigger a refetch
        artists: selectedArtists,
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return await fetchObjektsIndex({
        data: {
          ...searchParams,
          page: pageParam,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
  });
}

/**
 * User collection: Blockchain groups data source
 */
export function userCollectionBlockchainGroupsQuery(
  address: string,
  searchParams: z.infer<typeof userCollectionFrontendSchema>,
  selectedArtists: string[]
) {
  return infiniteQueryOptions({
    queryKey: [
      "collection",
      "blockchain-groups",
      address,
      {
        ...searchParams,
        locked: null, // should never trigger a refetch
        artists: selectedArtists,
      },
    ],
    queryFn: async ({ pageParam = 1 }: { pageParam?: number }) => {
      return await fetchObjektsBlockchainGroups({
        data: {
          ...searchParams,
          address,
          page: pageParam,
          artists: selectedArtists,
        },
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) =>
      lastPage.collections.length === BLOCKCHAIN_GROUPS_PER_PAGE
        ? lastPageParam + 1
        : undefined,
  });
}

/**
 * User collection: Blockchain data source
 */
export function userCollectionBlockchainQuery(
  address: string,
  searchParams: z.infer<typeof userCollectionFrontendSchema>,
  selectedArtists: string[]
) {
  return infiniteQueryOptions({
    queryKey: [
      "collection",
      "blockchain",
      address,
      {
        ...searchParams,
        locked: null, // should never trigger a refetch
        artists: selectedArtists,
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return await fetchObjektsBlockchain({
        data: {
          ...searchParams,
          address,
          page: pageParam,
          artists: selectedArtists,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
  });
}

/**
 * Objekt list: Listing entries
 */
export function objektListQuery(
  objektListId: string,
  searchParams: z.infer<typeof objektListFrontendSchema>,
  selectedArtists: string[]
) {
  return infiniteQueryOptions({
    queryKey: [
      "objekt-list",
      objektListId,
      {
        ...searchParams,
        artists: selectedArtists,
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return await fetchObjektListEntries({
        data: {
          ...searchParams,
          objektListId,
          page: pageParam,
          artists: selectedArtists,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
  });
}
