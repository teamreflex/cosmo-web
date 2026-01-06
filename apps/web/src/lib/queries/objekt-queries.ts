import { getTypesenseResults } from "@/lib/client/typesense";
import { $fetchObjektsBlockchain } from "@/lib/server/objekts/prefetching/objekt-blockchain";
import {
  $fetchObjektsBlockchainGroups,
  PER_PAGE as BLOCKCHAIN_GROUPS_PER_PAGE,
} from "@/lib/server/objekts/prefetching/objekt-blockchain-groups";
import { $fetchObjektsIndex } from "@/lib/server/objekts/prefetching/objekt-index";
import { $fetchObjektListEntries } from "@/lib/server/objekts/prefetching/objekt-list";
import { $fetchTransfers } from "@/lib/server/transfers";
import type {
  objektIndexFrontendSchema,
  objektListFrontendSchema,
  transfersFrontendSchema,
  userCollectionFrontendSchema,
} from "@/lib/universal/parsers";
import { normalizeFilters } from "@/lib/universal/parsers";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { z } from "zod";
import { ObjektMetadata } from "../universal/objekts";

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
    queryFn: ({ signal, pageParam = 0 }) => {
      return $fetchObjektsIndex({
        signal,
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
    queryFn: ({ signal, pageParam = 1 }) => {
      return $fetchObjektsBlockchainGroups({
        signal,
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
    queryFn: ({ signal, pageParam = 0 }) => {
      return $fetchObjektsBlockchain({
        signal,
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
    queryFn: ({ signal, pageParam = 0 }) => {
      return $fetchObjektListEntries({
        signal,
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
 * Transfers: Listing entries with cursor-based pagination
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
    queryFn: ({ signal, pageParam }) => {
      return $fetchTransfers({
        signal,
        data: {
          ...searchParams,
          address,
          cursor: pageParam,
          artists: selectedArtists,
        },
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });
}

/**
 * Objekt metadata: Fetching metadata about a collection
 */
export function objektMetadataQuery(slug: string) {
  return queryOptions({
    queryKey: ["collection-metadata", "metadata", slug],
    queryFn: ({ signal }) =>
      ofetch<ObjektMetadata>(`/api/objekts/metadata/${slug}`, {
        signal,
      }),
    retry: 1,
  });
}
