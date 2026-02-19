import type { CosmoMemberBFF } from "@apollo/cosmo/types/artists";
import { queryOptions } from "@tanstack/react-query";
import { $fetchArtists } from "../functions/artists";
import {
  $fetchCurrentAccount,
  $fetchFilterData,
  $fetchSelectedArtists,
  $fetchTargetAccount,
} from "../functions/core";

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
export const selectedArtistsQuery = queryOptions({
  queryKey: ["selected-artists"],
  queryFn: () => $fetchSelectedArtists(),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
