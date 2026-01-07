import type { AggregatedGravityData } from "@/lib/client/gravity/abstract/types";
import { baseUrl } from "@/lib/utils";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import {
  $fetchActiveGravities,
  $fetchCachedPoll,
  $fetchPaginatedGravities,
  $fetchPolygonGravity,
} from "../server/gravity";

export const activeGravitiesQuery = (artists?: string[]) =>
  queryOptions({
    queryKey: ["gravities", "active", { artists }],
    queryFn: () => $fetchActiveGravities({ data: { artists } }),
  });

export const paginatedGravitiesQuery = (artists?: string[]) =>
  infiniteQueryOptions({
    queryKey: ["gravities", "paginated", { artists }],
    queryFn: ({ pageParam }) =>
      $fetchPaginatedGravities({ data: { artists, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
  });

export type GravityPollDetailsParams = {
  artistName: string;
  tokenId: number;
  gravityId: number;
  pollId: number;
};

export const gravityPollDetailsQuery = (params: GravityPollDetailsParams) =>
  queryOptions({
    queryKey: [
      "gravity",
      "details",
      {
        artistName: params.artistName,
        gravityId: params.gravityId,
        tokenId: params.tokenId,
        pollId: params.pollId,
      },
    ],
    queryFn: ({ signal }) =>
      $fetchCachedPoll({
        signal,
        data: {
          artist: params.artistName,
          gravityId: params.gravityId,
          pollId: params.pollId,
          isPast: false,
        },
      }),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

export const polygonGravityQuery = (artist: string, id: number) =>
  queryOptions({
    queryKey: ["gravity", "polygon", artist, id],
    queryFn: ({ signal }) =>
      $fetchPolygonGravity({
        signal,
        data: {
          artist,
          id,
        },
      }),
  });

const VOTING_POLL_INTERVAL = 30_000;

export const gravityVoteDataQuery = (pollId: number) =>
  queryOptions({
    queryKey: ["gravity", "votes", pollId],
    queryFn: async ({ signal }) => {
      const url = new URL(`/api/gravity/${pollId}/aggregated`, baseUrl());
      return await ofetch<AggregatedGravityData>(url.toString(), { signal });
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      const { startDate, endDate } = query.state.data;
      const now = Date.now();
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      return now >= start && now < end ? VOTING_POLL_INTERVAL : false;
    },
  });
