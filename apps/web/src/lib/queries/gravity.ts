import { queryOptions } from "@tanstack/react-query";
import {
  $fetchCachedPoll,
  $fetchGravities,
  $fetchPolygonGravity,
} from "../server/gravity";

export const gravitiesIndexQuery = queryOptions({
  queryKey: ["gravities"],
  queryFn: $fetchGravities,
});

export type GravityPollDetailsParams = {
  artistName: string;
  tokenId: bigint;
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
        tokenId: Number(params.tokenId),
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
