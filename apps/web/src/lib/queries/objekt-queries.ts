import { infiniteQueryOptions } from "@tanstack/react-query";
import type {
  objektIndexFrontendSchema,
  objektListFrontendSchema,
  transfersFrontendSchema,
  userCollectionFrontendSchema,
} from "@/lib/universal/parsers";
import type z from "zod";
import { getTypesenseResults } from "@/lib/client/typesense";
import { $fetchObjektsIndex } from "@/lib/server/objekts/prefetching/objekt-index";
import {
  $fetchObjektsBlockchainGroups,
  PER_PAGE as BLOCKCHAIN_GROUPS_PER_PAGE,
} from "@/lib/server/objekts/prefetching/objekt-blockchain-groups";
import { $fetchObjektsBlockchain } from "@/lib/server/objekts/prefetching/objekt-blockchain";
import { $fetchObjektListEntries } from "@/lib/server/objekts/prefetching/objekt-list";
import { $fetchTransfers } from "@/lib/server/transfers";
import { normalizeFilters } from "@/lib/universal/parsers";

/**
 * Object index: Searching via Typesense
 */
export function objektIndexTypesenseQuery(
  searchParams: z.infer<typeof objektIndexFrontendSchema>,
  selectedArtists: string[],
) {
  return infiniteQueryOptions({
    queryKey: [
      "objekt-index",
      "typesense",
      {
        ...normalizeFilters(searchParams),
        id: null, // should never trigger a refetch
        search: searchParams.search || null,
        artists: selectedArtists,
      },
    ],
    queryFn: ({ pageParam = 0 }) => {
      return getTypesenseResults({
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
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}

/**
 * Object index: Listing via blockchain
 */
export function objektIndexBlockchainQuery(
  searchParams: z.infer<typeof objektIndexFrontendSchema>,
  selectedArtists: string[],
) {
  return infiniteQueryOptions({
    queryKey: [
      "objekt-index",
      "blockchain",
      {
        ...normalizeFilters(searchParams),
        id: null, // should never trigger a refetch
        search: searchParams.search ?? null, // required to make the types happy
        artists: selectedArtists,
      },
    ],
    queryFn: ({ pageParam = 0 }) => {
      return $fetchObjektsIndex({
        data: {
          ...searchParams,
          page: pageParam,
          artists: selectedArtists,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}

/**
 * User collection: Blockchain groups data source
 */
export function userCollectionBlockchainGroupsQuery(
  address: string,
  searchParams: z.infer<typeof userCollectionFrontendSchema>,
  selectedArtists: string[],
) {
  return infiniteQueryOptions({
    queryKey: [
      "collection",
      "blockchain-groups",
      address,
      {
        ...normalizeFilters(searchParams),
        artists: selectedArtists,
      },
    ],
    queryFn: ({ pageParam = 1 }) => {
      return $fetchObjektsBlockchainGroups({
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
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}

/**
 * User collection: Blockchain data source
 */
export function userCollectionBlockchainQuery(
  address: string,
  searchParams: z.infer<typeof userCollectionFrontendSchema>,
  selectedArtists: string[],
) {
  return infiniteQueryOptions({
    queryKey: [
      "collection",
      "blockchain",
      address,
      {
        ...normalizeFilters(searchParams),
        artists: selectedArtists,
      },
    ],
    queryFn: ({ pageParam = 0 }) => {
      return $fetchObjektsBlockchain({
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
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}

/**
 * Objekt list: Listing entries
 */
export function objektListQuery(
  objektListId: string,
  searchParams: z.infer<typeof objektListFrontendSchema>,
  selectedArtists: string[],
) {
  return infiniteQueryOptions({
    queryKey: [
      "objekt-list",
      objektListId,
      {
        ...normalizeFilters(searchParams),
        artists: selectedArtists,
      },
    ],
    queryFn: ({ pageParam = 0 }) => {
      return $fetchObjektListEntries({
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
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}

/**
 * Objekt list: Listing entries
 */
export function transfersQuery(
  address: string,
  searchParams: z.infer<typeof transfersFrontendSchema>,
  selectedArtists: string[],
) {
  return infiniteQueryOptions({
    queryKey: [
      "transfers",
      address,
      {
        ...normalizeFilters(searchParams),
        type: searchParams.type,
        artists: selectedArtists,
      },
    ],
    queryFn: ({ pageParam = 0 }) => {
      return $fetchTransfers({
        data: {
          ...searchParams,
          address,
          page: pageParam,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}
